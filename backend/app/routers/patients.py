from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import PatientProfile, MedicalReport, HealthRiskAssessment
from app.models.doctor import DoctorProfile
from app.models.appointment import Appointment, AppointmentStatus
from app.models.prescription import Prescription
from app.schemas.schemas import PatientProfileCreate, HealthRiskInput, AppointmentCreate
from app.utils.security import get_current_user, require_role
from app.utils.file_handler import save_upload
from app.services.ml_service import ml_service
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/patients", tags=["Patient Portal"])

@router.get("/dashboard")
async def patient_dashboard(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db)
):
    # Get profile
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    
    # Count reports
    result = await db.execute(select(func.count()).select_from(MedicalReport).where(MedicalReport.patient_id == current_user.id))
    report_count = result.scalar() or 0
    
    # Count appointments
    result = await db.execute(select(func.count()).select_from(Appointment).where(
        Appointment.patient_id == current_user.id,
        Appointment.status == AppointmentStatus.PENDING
    ))
    pending_appointments = result.scalar() or 0
    
    # Count prescriptions
    result = await db.execute(select(func.count()).select_from(Prescription).where(Prescription.patient_id == current_user.id))
    prescription_count = result.scalar() or 0
    
    # Latest risk assessment
    result = await db.execute(
        select(HealthRiskAssessment).where(HealthRiskAssessment.patient_id == current_user.id)
        .order_by(HealthRiskAssessment.assessed_at.desc()).limit(1)
    )
    risk = result.scalar_one_or_none()
    
    return {
        "user": {"id": current_user.id, "name": current_user.full_name, "email": current_user.email},
        "profile": {
            "age": profile.age if profile else None,
            "gender": profile.gender if profile else None,
            "blood_group": profile.blood_group if profile else None,
            "weight_kg": profile.weight_kg if profile else None,
            "height_cm": profile.height_cm if profile else None,
        } if profile else None,
        "stats": {
            "total_reports": report_count,
            "pending_appointments": pending_appointments,
            "total_prescriptions": prescription_count,
            "health_score": round((1 - (risk.overall_risk_score if risk else 0.15)) * 100)
        },
        "latest_risk": {
            "risk_level": risk.risk_level,
            "overall_score": risk.overall_risk_score,
            "diabetes_risk": risk.diabetes_risk,
            "heart_disease_risk": risk.heart_disease_risk,
            "hypertension_risk": risk.hypertension_risk,
        } if risk else None
    }

@router.put("/profile")
async def update_profile(
    data: PatientProfileCreate,
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    
    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    
    await db.commit()
    return {"message": "Profile updated successfully"}

@router.post("/reports/upload")
async def upload_report(
    file: UploadFile = File(...),
    report_type: str = Form("blood_report"),
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db)
):
    file_path = await save_upload(file, subfolder="reports")
    
    # Generate AI summary
    summary = ai_service.summarize_report(report_type, file.filename or "report")
    
    report = MedicalReport(
        patient_id=current_user.id,
        report_type=report_type,
        file_path=file_path,
        file_name=file.filename or "report",
        ai_summary=summary,
        risk_indicators=[],
        abnormal_values=[]
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    
    return {
        "id": report.id,
        "file_name": report.file_name,
        "report_type": report.report_type,
        "ai_summary": report.ai_summary,
        "uploaded_at": str(report.uploaded_at)
    }

@router.get("/reports")
async def list_reports(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MedicalReport).where(MedicalReport.patient_id == current_user.id)
        .order_by(MedicalReport.uploaded_at.desc())
    )
    reports = result.scalars().all()
    
    return [{
        "id": r.id,
        "file_name": r.file_name,
        "report_type": r.report_type,
        "ai_summary": r.ai_summary,
        "uploaded_at": str(r.uploaded_at)
    } for r in reports]

@router.post("/health-risk")
async def analyze_health_risk(
    data: HealthRiskInput,
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db)
):
    risk_result = ml_service.predict_health_risk(data.model_dump())
    explanation = ai_service.explain_risk(risk_result)
    
    assessment = HealthRiskAssessment(
        patient_id=current_user.id,
        diabetes_risk=risk_result["diabetes_risk"],
        heart_disease_risk=risk_result["heart_disease_risk"],
        hypertension_risk=risk_result["hypertension_risk"],
        obesity_risk=risk_result["obesity_risk"],
        overall_risk_score=risk_result["overall_risk_score"],
        risk_level=risk_result["risk_level"],
        ai_explanation=explanation,
        recommended_specialists=risk_result["recommended_specialists"]
    )
    db.add(assessment)
    await db.commit()
    
    return {
        **risk_result,
        "explanation": explanation
    }

@router.get("/doctor-recommendations")
async def get_doctor_recommendations(
    condition: str = "general",
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DoctorProfile, User).join(User, DoctorProfile.user_id == User.id)
    )
    rows = result.all()
    
    doctors = []
    for doc, user in rows:
        doctors.append({
            "id": user.id,
            "name": user.full_name,
            "specialization": doc.specialization,
            "experience_years": doc.experience_years,
            "rating": doc.rating,
            "success_rate": doc.success_rate,
            "consultation_fee": doc.consultation_fee,
            "hospital": doc.hospital,
            "is_available": doc.is_available,
            "qualification": doc.qualification,
            "available_hours": doc.available_hours
        })
    
    ranked = ml_service.recommend_doctors(condition, doctors)
    return ranked

@router.post("/appointments")
async def book_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db)
):
    # Get doctor info
    result = await db.execute(select(User).where(User.id == data.doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == data.doctor_id))
    doc_profile = result.scalar_one_or_none()
    
    appointment = Appointment(
        patient_id=current_user.id,
        doctor_id=data.doctor_id,
        patient_name=current_user.full_name,
        doctor_name=doctor.full_name,
        specialization=doc_profile.specialization if doc_profile else "",
        date=data.date,
        time=data.time,
        reason=data.reason
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    
    return {"message": "Appointment booked successfully", "appointment_id": appointment.id}

@router.get("/appointments")
async def list_appointments(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Appointment).where(Appointment.patient_id == current_user.id)
        .order_by(Appointment.created_at.desc())
    )
    appointments = result.scalars().all()
    
    return [{
        "id": a.id,
        "doctor_name": a.doctor_name,
        "specialization": a.specialization,
        "date": a.date,
        "time": a.time,
        "status": a.status.value,
        "reason": a.reason,
        "notes": a.notes
    } for a in appointments]

@router.get("/prescriptions")
async def list_prescriptions(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Prescription).where(Prescription.patient_id == current_user.id)
        .order_by(Prescription.created_at.desc())
    )
    prescriptions = result.scalars().all()
    
    return [{
        "id": p.id,
        "doctor_name": p.doctor_name,
        "diagnosis": p.diagnosis,
        "medicines": p.medicines,
        "instructions": p.instructions,
        "is_dispensed": p.is_dispensed,
        "created_at": str(p.created_at)
    } for p in prescriptions]
