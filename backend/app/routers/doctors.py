from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import PatientProfile, HealthRiskAssessment
from app.models.doctor import DoctorProfile
from app.models.appointment import Appointment, AppointmentStatus
from app.models.prescription import Prescription
from app.schemas.schemas import PrescriptionCreate, AppointmentUpdate, DoctorProfileCreate
from app.utils.security import require_role
from app.models.patient import MedicalReport

router = APIRouter(prefix="/api/doctors", tags=["Doctor Portal"])

@router.get("/dashboard")
async def doctor_dashboard(current_user: User = Depends(require_role(UserRole.DOCTOR)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    result = await db.execute(select(func.count()).select_from(Appointment).where(Appointment.doctor_id == current_user.id, Appointment.status == AppointmentStatus.PENDING))
    pending = result.scalar() or 0
    from datetime import date
    today = date.today().isoformat()
    result = await db.execute(select(func.count()).select_from(Appointment).where(Appointment.doctor_id == current_user.id, Appointment.date == today))
    today_count = result.scalar() or 0
    result = await db.execute(select(func.count(func.distinct(Appointment.patient_id))).where(Appointment.doctor_id == current_user.id))
    total_patients = result.scalar() or 0
    result = await db.execute(select(func.count()).select_from(Prescription).where(Prescription.doctor_id == current_user.id))
    total_rx = result.scalar() or 0
    result = await db.execute(select(HealthRiskAssessment, User).join(User, HealthRiskAssessment.patient_id == User.id).where(HealthRiskAssessment.risk_level.in_(["high", "critical"])).order_by(HealthRiskAssessment.assessed_at.desc()).limit(5))
    risk_alerts = [{"patient_id": u.id, "patient_name": u.full_name, "risk_level": r.risk_level, "overall_score": r.overall_risk_score} for r, u in result.all()]
    return {"user": {"id": current_user.id, "name": current_user.full_name}, "profile": {"specialization": profile.specialization, "experience_years": profile.experience_years, "rating": profile.rating} if profile else None, "stats": {"pending_appointments": pending, "today_appointments": today_count, "total_patients": total_patients, "total_prescriptions": total_rx}, "risk_alerts": risk_alerts}

@router.put("/profile")
async def update_doctor_profile(data: DoctorProfileCreate, current_user: User = Depends(require_role(UserRole.DOCTOR)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = DoctorProfile(user_id=current_user.id, specialization=data.specialization)
        db.add(profile)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    await db.commit()
    return {"message": "Profile updated"}

@router.get("/patients")
async def list_patients(current_user: User = Depends(require_role(UserRole.DOCTOR)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.distinct(Appointment.patient_id)).where(Appointment.doctor_id == current_user.id))
    patient_ids = [row[0] for row in result.all()]
    if not patient_ids:
        return []
    patients = []
    for pid in patient_ids:
        result = await db.execute(select(User).where(User.id == pid))
        user = result.scalar_one_or_none()
        if not user: continue
        result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == pid))
        profile = result.scalar_one_or_none()
        result = await db.execute(select(HealthRiskAssessment).where(HealthRiskAssessment.patient_id == pid).order_by(HealthRiskAssessment.assessed_at.desc()).limit(1))
        risk = result.scalar_one_or_none()
        patients.append({"id": user.id, "name": user.full_name, "email": user.email, "age": profile.age if profile else None, "gender": profile.gender if profile else None, "blood_group": profile.blood_group if profile else None, "risk_level": risk.risk_level if risk else "unknown"})
    return patients

@router.get("/patients/{patient_id}")
async def get_patient_detail(patient_id: int, current_user: User = Depends(require_role(UserRole.DOCTOR)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == patient_id))
    profile = result.scalar_one_or_none()
    result = await db.execute(select(MedicalReport).where(MedicalReport.patient_id == patient_id).order_by(MedicalReport.uploaded_at.desc()))
    reports = result.scalars().all()
    result = await db.execute(select(Prescription).where(Prescription.patient_id == patient_id).order_by(Prescription.created_at.desc()))
    prescriptions = result.scalars().all()
    result = await db.execute(select(HealthRiskAssessment).where(HealthRiskAssessment.patient_id == patient_id).order_by(HealthRiskAssessment.assessed_at.desc()).limit(1))
    risk = result.scalar_one_or_none()
    return {"patient": {"id": patient.id, "name": patient.full_name, "email": patient.email, "profile": {"age": profile.age, "gender": profile.gender, "blood_group": profile.blood_group, "height_cm": profile.height_cm, "weight_kg": profile.weight_kg, "medical_history": profile.medical_history, "allergies": profile.allergies} if profile else None}, "reports": [{"id": r.id, "type": r.report_type, "file_name": r.file_name, "summary": r.ai_summary, "date": str(r.uploaded_at)} for r in reports], "prescriptions": [{"id": p.id, "diagnosis": p.diagnosis, "medicines": p.medicines, "date": str(p.created_at)} for p in prescriptions], "risk_assessment": {"risk_level": risk.risk_level, "overall_score": risk.overall_risk_score, "explanation": risk.ai_explanation} if risk else None}

@router.post("/prescriptions")
async def create_prescription(data: PrescriptionCreate, current_user: User = Depends(require_role(UserRole.DOCTOR)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == data.patient_id))
    patient = result.scalar_one_or_none()
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")
    rx = Prescription(patient_id=data.patient_id, doctor_id=current_user.id, patient_name=patient.full_name, doctor_name=current_user.full_name, diagnosis=data.diagnosis, medicines=[m.model_dump() for m in data.medicines], instructions=data.instructions)
    db.add(rx)
    await db.commit()
    await db.refresh(rx)
    return {"message": "Prescription created", "prescription_id": rx.id}

@router.get("/appointments")
async def list_doctor_appointments(current_user: User = Depends(require_role(UserRole.DOCTOR)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Appointment).where(Appointment.doctor_id == current_user.id).order_by(Appointment.date.desc()))
    return [{"id": a.id, "patient_name": a.patient_name, "date": a.date, "time": a.time, "status": a.status.value, "reason": a.reason, "notes": a.notes} for a in result.scalars().all()]

@router.put("/appointments/{appointment_id}")
async def update_appointment(appointment_id: int, data: AppointmentUpdate, current_user: User = Depends(require_role(UserRole.DOCTOR)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id, Appointment.doctor_id == current_user.id))
    apt = result.scalar_one_or_none()
    if not apt: raise HTTPException(status_code=404, detail="Appointment not found")
    if data.status: apt.status = AppointmentStatus(data.status)
    if data.notes: apt.notes = data.notes
    await db.commit()
    return {"message": "Appointment updated"}
