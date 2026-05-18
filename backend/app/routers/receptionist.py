from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date
from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.schemas import ReceptionistPatientRegister, ReceptionistAppointmentCreate
from app.utils.security import get_current_user, require_role, hash_password

router = APIRouter(prefix="/api/receptionist", tags=["Receptionist Portal"])

# ── Dashboard ──────────────────────────────────────────
@router.get("/dashboard")
async def receptionist_dashboard(
    current_user: User = Depends(require_role(UserRole.RECEPTIONIST)),
    db: AsyncSession = Depends(get_db)
):
    today = date.today().isoformat()

    # Today's appointments
    result = await db.execute(
        select(func.count()).select_from(Appointment).where(Appointment.date == today)
    )
    today_appointments = result.scalar() or 0

    # Total patients
    result = await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.PATIENT)
    )
    total_patients = result.scalar() or 0

    # Total doctors
    result = await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.DOCTOR)
    )
    total_doctors = result.scalar() or 0

    # Pending appointments
    result = await db.execute(
        select(func.count()).select_from(Appointment).where(
            Appointment.status == AppointmentStatus.PENDING
        )
    )
    pending_appointments = result.scalar() or 0

    # Total appointments
    result = await db.execute(select(func.count()).select_from(Appointment))
    total_appointments = result.scalar() or 0

    # Recent appointments
    result = await db.execute(
        select(Appointment).order_by(Appointment.created_at.desc()).limit(5)
    )
    recent = result.scalars().all()

    return {
        "user": {"id": current_user.id, "name": current_user.full_name},
        "stats": {
            "today_appointments": today_appointments,
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "pending_appointments": pending_appointments,
            "total_appointments": total_appointments,
        },
        "recent_appointments": [{
            "id": a.id,
            "patient_name": a.patient_name,
            "doctor_name": a.doctor_name,
            "specialization": a.specialization,
            "date": a.date,
            "time": a.time,
            "status": a.status.value,
        } for a in recent]
    }


# ── List all doctors ────────────────────────────────────
@router.get("/doctors")
async def list_doctors(
    current_user: User = Depends(require_role(UserRole.RECEPTIONIST)),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DoctorProfile, User).join(User, DoctorProfile.user_id == User.id)
    )
    rows = result.all()

    return [{
        "id": user.id,
        "name": user.full_name,
        "specialization": doc.specialization,
        "experience_years": doc.experience_years,
        "qualification": doc.qualification,
        "rating": doc.rating,
        "consultation_fee": doc.consultation_fee,
        "is_available": doc.is_available,
        "available_hours": doc.available_hours,
    } for doc, user in rows]


# ── Register a new patient ──────────────────────────────
@router.post("/register-patient")
async def register_patient(
    data: ReceptionistPatientRegister,
    current_user: User = Depends(require_role(UserRole.RECEPTIONIST)),
    db: AsyncSession = Depends(get_db)
):
    # Check if email already registered
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user with a default password
    user = User(
        email=data.email,
        password_hash=hash_password("password123"),
        full_name=data.full_name,
        role=UserRole.PATIENT,
        phone=data.phone or ""
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create patient profile
    profile = PatientProfile(
        user_id=user.id,
        age=data.age,
        gender=data.gender,
        blood_group=data.blood_group,
        height_cm=data.height_cm,
        weight_kg=data.weight_kg,
        medical_history=data.medical_history or "",
        allergies=data.allergies or "",
        emergency_contact=data.emergency_contact or "",
        address=data.address or "",
    )
    db.add(profile)
    await db.commit()

    return {
        "message": f"Patient {data.full_name} registered successfully",
        "patient_id": user.id,
        "email": user.email,
        "default_password": "password123"
    }


# ── List all patients ───────────────────────────────────
@router.get("/patients")
async def list_patients(
    q: str = "",
    current_user: User = Depends(require_role(UserRole.RECEPTIONIST)),
    db: AsyncSession = Depends(get_db)
):
    query = select(User, PatientProfile).outerjoin(
        PatientProfile, User.id == PatientProfile.user_id
    ).where(User.role == UserRole.PATIENT)

    if q:
        query = query.where(User.full_name.ilike(f"%{q}%"))

    query = query.order_by(User.created_at.desc())
    result = await db.execute(query)
    rows = result.all()

    return [{
        "id": user.id,
        "name": user.full_name,
        "email": user.email,
        "phone": user.phone or "",
        "age": profile.age if profile else None,
        "gender": profile.gender if profile else None,
        "blood_group": profile.blood_group if profile else None,
    } for user, profile in rows]


# ── Create appointment (assign doctor) ──────────────────
@router.post("/appointments")
async def create_appointment(
    data: ReceptionistAppointmentCreate,
    current_user: User = Depends(require_role(UserRole.RECEPTIONIST)),
    db: AsyncSession = Depends(get_db)
):
    # Get patient
    result = await db.execute(select(User).where(User.id == data.patient_id, User.role == UserRole.PATIENT))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Get doctor
    result = await db.execute(select(User).where(User.id == data.doctor_id, User.role == UserRole.DOCTOR))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Get doctor profile for specialization
    result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == data.doctor_id))
    doc_profile = result.scalar_one_or_none()

    appointment = Appointment(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        patient_name=patient.full_name,
        doctor_name=doctor.full_name,
        specialization=doc_profile.specialization if doc_profile else "",
        date=data.date,
        time=data.time,
        reason=data.reason,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    return {
        "message": f"Appointment booked — {patient.full_name} with {doctor.full_name}",
        "appointment_id": appointment.id
    }


# ── List all appointments ───────────────────────────────
@router.get("/appointments")
async def list_appointments(
    date_filter: str = "",
    current_user: User = Depends(require_role(UserRole.RECEPTIONIST)),
    db: AsyncSession = Depends(get_db)
):
    query = select(Appointment).order_by(Appointment.created_at.desc())

    if date_filter:
        query = query.where(Appointment.date == date_filter)

    result = await db.execute(query)
    appointments = result.scalars().all()

    return [{
        "id": a.id,
        "patient_name": a.patient_name,
        "doctor_name": a.doctor_name,
        "specialization": a.specialization,
        "date": a.date,
        "time": a.time,
        "status": a.status.value,
        "reason": a.reason or "",
    } for a in appointments]


# ── Notifications ───────────────────────────────────────
@router.get("/notifications")
async def get_notifications(
    current_user: User = Depends(require_role(UserRole.RECEPTIONIST)),
    db: AsyncSession = Depends(get_db)
):
    from datetime import date, timedelta
    from app.models.medicine import Medicine
    
    exp_date = (date.today() + timedelta(days=30)).isoformat()
    result = await db.execute(
        select(Medicine).where(
            Medicine.expiry_date <= exp_date,
            Medicine.expiry_date != "",
            Medicine.stock > 0
        )
    )
    expiring = [{
        "id": m.id,
        "name": m.name,
        "stock": m.stock,
        "expiry_date": m.expiry_date
    } for m in result.scalars().all()]
    
    return {"expiring_medicines": expiring}
