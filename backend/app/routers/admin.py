from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import HealthRiskAssessment
from app.models.appointment import Appointment
from app.models.prescription import Prescription
from app.models.medicine import Medicine
from app.models.sustainability import SustainabilityMetric, SustainabilityGoal
from app.models.billing import HospitalBill, PharmacyBill
from app.schemas.schemas import SustainabilityInput, HospitalBillCreate
from app.utils.security import require_role
from app.services.ml_service import ml_service
from app.services.ai_service import ai_service
from datetime import date, timedelta

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

@router.get("/dashboard")
async def admin_dashboard(current_user: User = Depends(require_role(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    patients = (await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.PATIENT))).scalar() or 0
    doctors = (await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.DOCTOR))).scalar() or 0
    pharmacists = (await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.PHARMACIST))).scalar() or 0
    total_appointments = (await db.execute(select(func.count()).select_from(Appointment))).scalar() or 0
    total_prescriptions = (await db.execute(select(func.count()).select_from(Prescription))).scalar() or 0
    total_medicines = (await db.execute(select(func.count()).select_from(Medicine))).scalar() or 0
    total_pharmacy_revenue = (await db.execute(select(func.sum(PharmacyBill.total_amount)))).scalar() or 0
    total_hospital_bills = (await db.execute(select(func.sum(HospitalBill.amount)))).scalar() or 0
    result = await db.execute(select(SustainabilityMetric).order_by(SustainabilityMetric.date.desc()).limit(1))
    latest_sust = result.scalar_one_or_none()
    return {
        "stats": {
            "total_users": total_users, "patients": patients, "doctors": doctors,
            "pharmacists": pharmacists, "total_appointments": total_appointments,
            "total_prescriptions": total_prescriptions, "total_medicines": total_medicines,
            "pharmacy_revenue": round(total_pharmacy_revenue, 2),
            "hospital_expenses": round(total_hospital_bills, 2)
        },
        "latest_sustainability": {
            "date": latest_sust.date, "electricity_kwh": latest_sust.electricity_kwh,
            "carbon_footprint_kg": latest_sust.carbon_footprint_kg,
            "efficiency_score": round(max(0, 100 - latest_sust.electricity_kwh/10 - latest_sust.waste_kg/2), 1)
        } if latest_sust else None
    }

@router.get("/users")
async def list_users(current_user: User = Depends(require_role(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role.value, "phone": u.phone, "is_active": u.is_active, "created_at": str(u.created_at)} for u in result.scalars().all()]

@router.post("/sustainability")
async def log_sustainability(data: SustainabilityInput, current_user: User = Depends(require_role(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)):
    carbon = data.electricity_kwh * 0.42 + data.water_liters * 0.001 + data.waste_kg * 0.5 + data.medical_waste_kg * 1.2
    metric = SustainabilityMetric(date=data.date, electricity_kwh=data.electricity_kwh, water_liters=data.water_liters, waste_kg=data.waste_kg, medical_waste_kg=data.medical_waste_kg, paper_sheets=data.paper_sheets, ward_occupancy_pct=data.ward_occupancy_pct, equipment_utilization_pct=data.equipment_utilization_pct, carbon_footprint_kg=round(carbon, 2), notes=data.notes, recorded_by=current_user.id)
    db.add(metric)
    await db.commit()
    return {"message": "Sustainability data logged", "carbon_footprint_kg": round(carbon, 2)}

@router.get("/sustainability")
async def get_sustainability(current_user: User = Depends(require_role(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SustainabilityMetric).order_by(SustainabilityMetric.date.desc()).limit(30))
    metrics = result.scalars().all()
    return [{"id": m.id, "date": m.date, "electricity_kwh": m.electricity_kwh, "water_liters": m.water_liters, "waste_kg": m.waste_kg, "medical_waste_kg": m.medical_waste_kg, "paper_sheets": m.paper_sheets, "ward_occupancy_pct": m.ward_occupancy_pct, "equipment_utilization_pct": m.equipment_utilization_pct, "carbon_footprint_kg": m.carbon_footprint_kg} for m in metrics]

@router.get("/sustainability/forecast")
async def sustainability_forecast(current_user: User = Depends(require_role(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SustainabilityMetric).order_by(SustainabilityMetric.date.desc()).limit(30))
    metrics = [{"electricity_kwh": m.electricity_kwh, "water_liters": m.water_liters, "waste_kg": m.waste_kg, "ward_occupancy_pct": m.ward_occupancy_pct, "carbon_footprint_kg": m.carbon_footprint_kg} for m in result.scalars().all()]
    return ml_service.predict_sustainability(metrics)

@router.get("/sustainability/report")
async def sustainability_report(current_user: User = Depends(require_role(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SustainabilityMetric).order_by(SustainabilityMetric.date.desc()).limit(30))
    metrics = [{"electricity_kwh": m.electricity_kwh, "water_liters": m.water_liters, "waste_kg": m.waste_kg, "ward_occupancy_pct": m.ward_occupancy_pct, "carbon_footprint_kg": m.carbon_footprint_kg} for m in result.scalars().all()]
    predictions = ml_service.predict_sustainability(metrics)
    report = ai_service.generate_sustainability_report({}, predictions)
    return {"report": report}

@router.get("/analytics")
async def platform_analytics(current_user: User = Depends(require_role(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HealthRiskAssessment.risk_level, func.count()).group_by(HealthRiskAssessment.risk_level))
    risk_dist = {row[0]: row[1] for row in result.all()}
    result = await db.execute(select(Appointment.status, func.count()).group_by(Appointment.status))
    apt_dist = {row[0].value if hasattr(row[0], 'value') else str(row[0]): row[1] for row in result.all()}
    result = await db.execute(select(Medicine.category, func.count(), func.sum(Medicine.stock)).group_by(Medicine.category))
    med_cats = [{"category": row[0], "count": row[1], "stock": row[2] or 0} for row in result.all()]
    # Monthly pharmacy revenue (last 6 months)
    result = await db.execute(select(PharmacyBill.billed_at, PharmacyBill.total_amount).order_by(PharmacyBill.billed_at.desc()).limit(200))
    bills = result.all()
    monthly_revenue: dict = {}
    for billed_at, amount in bills:
        if billed_at:
            key = str(billed_at)[:7]
            monthly_revenue[key] = round(monthly_revenue.get(key, 0) + (amount or 0), 2)
    # Monthly expenses
    result2 = await db.execute(select(HospitalBill.month, func.sum(HospitalBill.amount)).group_by(HospitalBill.month).order_by(HospitalBill.month.desc()).limit(6))
    monthly_expenses = {row[0]: round(row[1] or 0, 2) for row in result2.all()}
    # Sustainability trend (last 7 days)
    result3 = await db.execute(select(SustainabilityMetric).order_by(SustainabilityMetric.date.desc()).limit(7))
    sust_trend = [{"date": m.date, "carbon_footprint_kg": m.carbon_footprint_kg, "electricity_kwh": m.electricity_kwh} for m in result3.scalars().all()]
    return {
        "risk_distribution": risk_dist,
        "appointment_distribution": apt_dist,
        "medicine_categories": med_cats,
        "monthly_revenue": monthly_revenue,
        "monthly_expenses": monthly_expenses,
        "sustainability_trend": sust_trend
    }

# ── Hospital Bills (Budget) ──────────────────────────────────────────

@router.post("/bills")
async def upload_hospital_bill(data: HospitalBillCreate, current_user: User = Depends(require_role(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)):
    bill = HospitalBill(
        bill_type=data.bill_type, vendor_name=data.vendor_name, amount=data.amount,
        month=data.month or date.today().strftime("%Y-%m"),
        description=data.description, file_name=data.file_name,
        uploaded_by=current_user.id
    )
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return {"message": "Bill uploaded", "id": bill.id}

@router.get("/bills")
async def list_hospital_bills(current_user: User = Depends(require_role(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HospitalBill).order_by(HospitalBill.uploaded_at.desc()))
    return [{"id": b.id, "bill_type": b.bill_type, "vendor_name": b.vendor_name, "amount": b.amount, "month": b.month, "description": b.description, "file_name": b.file_name, "uploaded_at": str(b.uploaded_at)} for b in result.scalars().all()]

@router.get("/budget/analysis")
async def budget_analysis(current_user: User = Depends(require_role(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)):
    """AI-powered monthly budget analysis and next-month prediction."""
    result = await db.execute(select(HospitalBill.month, HospitalBill.bill_type, func.sum(HospitalBill.amount)).group_by(HospitalBill.month, HospitalBill.bill_type).order_by(HospitalBill.month))
    rows = result.all()
    # Revenue from pharmacy
    result2 = await db.execute(select(PharmacyBill.billed_at, func.sum(PharmacyBill.total_amount)).group_by(func.strftime("%Y-%m", PharmacyBill.billed_at)))
    rev_rows = result2.all()
    monthly_revenue = {str(row[0])[:7]: round(row[1] or 0, 2) for row in rev_rows if row[0]}
    # Aggregate expenses by month and category
    from collections import defaultdict
    expenses: dict = defaultdict(lambda: defaultdict(float))
    for month, bill_type, amount in rows:
        expenses[month][bill_type] = round(expenses[month][bill_type] + (amount or 0), 2)
    monthly_totals = {m: round(sum(cats.values()), 2) for m, cats in expenses.items()}
    # AI prediction
    analysis = ai_service.analyze_budget(dict(monthly_totals), monthly_revenue)
    # CO2 / sustainability prediction
    result3 = await db.execute(select(SustainabilityMetric).order_by(SustainabilityMetric.date.desc()).limit(30))
    sust_data = [{"electricity_kwh": m.electricity_kwh, "water_liters": m.water_liters, "waste_kg": m.waste_kg, "ward_occupancy_pct": m.ward_occupancy_pct, "carbon_footprint_kg": m.carbon_footprint_kg} for m in result3.scalars().all()]
    co2_forecast = ml_service.predict_sustainability(sust_data)
    return {
        "monthly_expenses": dict(expenses),
        "monthly_totals": monthly_totals,
        "monthly_revenue": monthly_revenue,
        "ai_analysis": analysis,
        "co2_forecast": co2_forecast
    }
