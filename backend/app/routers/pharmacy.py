from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.medicine import Medicine, MedicineLog
from app.models.prescription import Prescription
from app.models.billing import PharmacyBill
from app.schemas.schemas import MedicineCreate, MedicineUpdate, PharmacyBillCreate
from app.utils.security import require_role
from app.services.ml_service import ml_service
import uuid
from datetime import date

router = APIRouter(prefix="/api/pharmacy", tags=["Pharmacy Portal"])

@router.get("/dashboard")
async def pharmacy_dashboard(current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).select_from(Medicine))).scalar() or 0
    low_stock = (await db.execute(select(func.count()).select_from(Medicine).where(Medicine.stock <= Medicine.min_stock_level))).scalar() or 0
    pending_rx = (await db.execute(select(func.count()).select_from(Prescription).where(Prescription.is_dispensed == 0))).scalar() or 0
    total_value = (await db.execute(select(func.sum(Medicine.stock * Medicine.unit_price)))).scalar() or 0
    from datetime import timedelta
    exp_date = (date.today() + timedelta(days=30)).isoformat()
    result = await db.execute(select(Medicine).where(Medicine.expiry_date <= exp_date, Medicine.expiry_date != "", Medicine.stock > 0))
    expiring = [{"id": m.id, "name": m.name, "stock": m.stock, "expiry_date": m.expiry_date} for m in result.scalars().all()]
    result = await db.execute(select(Medicine).where(Medicine.stock <= Medicine.min_stock_level, Medicine.stock > 0).limit(10))
    low_stock_items = [{"id": m.id, "name": m.name, "stock": m.stock, "min_stock": m.min_stock_level} for m in result.scalars().all()]
    # Today's billing revenue
    today = date.today().isoformat()
    today_revenue = (await db.execute(select(func.sum(PharmacyBill.total_amount)).where(func.date(PharmacyBill.billed_at) == today))).scalar() or 0
    total_bills = (await db.execute(select(func.count()).select_from(PharmacyBill))).scalar() or 0
    return {
        "stats": {"total_medicines": total, "low_stock_count": low_stock, "pending_prescriptions": pending_rx, "inventory_value": round(total_value, 2), "today_revenue": round(today_revenue, 2), "total_bills": total_bills},
        "expiring_soon": expiring[:5],
        "low_stock_alerts": low_stock_items
    }

@router.get("/inventory")
async def list_inventory(current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Medicine).order_by(Medicine.name))
    return [{"id": m.id, "name": m.name, "generic_name": m.generic_name, "category": m.category, "stock": m.stock, "unit_price": m.unit_price, "expiry_date": m.expiry_date, "manufacturer": m.manufacturer, "supplier": m.supplier, "is_eco_friendly": m.is_eco_friendly, "min_stock_level": m.min_stock_level, "batch_number": m.batch_number} for m in result.scalars().all()]

@router.post("/inventory")
async def add_medicine(data: MedicineCreate, current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    med = Medicine(**data.model_dump())
    db.add(med)
    await db.commit()
    await db.refresh(med)
    log = MedicineLog(medicine_id=med.id, medicine_name=med.name, action="restocked", quantity=med.stock, performed_by=current_user.id, notes="Initial stock")
    db.add(log)
    await db.commit()
    return {"message": "Medicine added", "id": med.id}

@router.put("/inventory/{medicine_id}")
async def update_medicine(medicine_id: int, data: MedicineUpdate, current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Medicine).where(Medicine.id == medicine_id))
    med = result.scalar_one_or_none()
    if not med: raise HTTPException(status_code=404, detail="Medicine not found")
    if data.stock is not None:
        diff = data.stock - med.stock
        med.stock = data.stock
        log = MedicineLog(medicine_id=med.id, medicine_name=med.name, action="restocked" if diff > 0 else "adjusted", quantity=abs(diff), performed_by=current_user.id)
        db.add(log)
    if data.unit_price is not None: med.unit_price = data.unit_price
    if data.min_stock_level is not None: med.min_stock_level = data.min_stock_level
    await db.commit()
    return {"message": "Medicine updated"}

@router.get("/prescriptions")
async def pending_prescriptions(current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prescription).where(Prescription.is_dispensed == 0).order_by(Prescription.created_at.desc()))
    return [{"id": p.id, "patient_name": p.patient_name, "doctor_name": p.doctor_name, "diagnosis": p.diagnosis, "medicines": p.medicines, "instructions": p.instructions, "created_at": str(p.created_at)} for p in result.scalars().all()]

@router.post("/dispense/{prescription_id}")
async def dispense_prescription(prescription_id: int, current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prescription).where(Prescription.id == prescription_id))
    rx = result.scalar_one_or_none()
    if not rx: raise HTTPException(status_code=404, detail="Prescription not found")
    if rx.is_dispensed: raise HTTPException(status_code=400, detail="Already dispensed")
    for med_item in (rx.medicines or []):
        name = med_item.get("name", "")
        result2 = await db.execute(select(Medicine).where(Medicine.name == name))
        med = result2.scalar_one_or_none()
        if med and med.stock > 0:
            med.stock = max(0, med.stock - 1)
            log = MedicineLog(medicine_id=med.id, medicine_name=med.name, action="dispensed", quantity=1, performed_by=current_user.id, notes=f"Prescription #{rx.id}")
            db.add(log)
    rx.is_dispensed = 1
    await db.commit()
    return {"message": "Prescription dispensed"}

@router.get("/demand-forecast")
async def demand_forecast(current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Medicine).where(Medicine.stock > 0).limit(20))
    medicines = result.scalars().all()
    return [ml_service.forecast_medicine_demand(med.name, med.stock) for med in medicines]

@router.get("/analytics")
async def pharmacy_analytics(current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MedicineLog).order_by(MedicineLog.created_at.desc()).limit(50))
    logs = [{"id": l.id, "medicine_name": l.medicine_name, "action": l.action, "quantity": l.quantity, "date": str(l.created_at)} for l in result.scalars().all()]
    result = await db.execute(select(Medicine.category, func.count(), func.sum(Medicine.stock)).group_by(Medicine.category))
    categories = [{"category": row[0], "count": row[1], "total_stock": row[2] or 0} for row in result.all()]
    return {"recent_logs": logs, "category_breakdown": categories}

# ── BILLING ─────────────────────────────────────────────────────────

@router.post("/bills")
async def create_bill(data: PharmacyBillCreate, current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    # Compute totals
    items_detail = []
    subtotal = 0.0
    for item in data.items:
        # Look up current price if not provided
        unit_price = item.unit_price
        if unit_price == 0:
            res = await db.execute(select(Medicine).where(Medicine.name == item.name))
            med = res.scalar_one_or_none()
            unit_price = med.unit_price if med else 0.0
        line_total = round(unit_price * item.qty, 2)
        subtotal += line_total
        items_detail.append({"name": item.name, "qty": item.qty, "unit_price": unit_price, "total": line_total})
        # Deduct stock
        res = await db.execute(select(Medicine).where(Medicine.name == item.name))
        med = res.scalar_one_or_none()
        if med:
            med.stock = max(0, med.stock - item.qty)
            db.add(MedicineLog(medicine_id=med.id, medicine_name=med.name, action="dispensed", quantity=item.qty, performed_by=current_user.id, notes="Billing"))

    discount_amt = round(subtotal * data.discount_pct / 100, 2)
    after_discount = subtotal - discount_amt
    tax_amt = round(after_discount * data.tax_pct / 100, 2)
    total = round(after_discount + tax_amt, 2)

    bill_number = f"BILL-{date.today().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    bill = PharmacyBill(
        bill_number=bill_number,
        patient_name=data.patient_name,
        patient_id=data.patient_id,
        prescription_id=data.prescription_id,
        prescription_type=data.prescription_type,
        items=items_detail,
        subtotal=round(subtotal, 2),
        discount_pct=data.discount_pct,
        tax_pct=data.tax_pct,
        total_amount=total,
        payment_method=data.payment_method,
        notes=data.notes,
        billed_by=current_user.id,
    )
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return {"message": "Bill created", "bill_id": bill.id, "bill_number": bill_number, "subtotal": round(subtotal, 2), "discount": discount_amt, "tax": tax_amt, "total": total, "items": items_detail}

@router.get("/bills")
async def list_bills(current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PharmacyBill).order_by(PharmacyBill.billed_at.desc()).limit(100))
    return [{"id": b.id, "bill_number": b.bill_number, "patient_name": b.patient_name, "prescription_type": b.prescription_type, "total_amount": b.total_amount, "payment_method": b.payment_method, "items": b.items, "billed_at": str(b.billed_at)} for b in result.scalars().all()]

@router.get("/bills/{bill_id}")
async def get_bill(bill_id: int, current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PharmacyBill).where(PharmacyBill.id == bill_id))
    b = result.scalar_one_or_none()
    if not b: raise HTTPException(status_code=404, detail="Bill not found")
    return {"id": b.id, "bill_number": b.bill_number, "patient_name": b.patient_name, "prescription_type": b.prescription_type, "items": b.items, "subtotal": b.subtotal, "discount_pct": b.discount_pct, "tax_pct": b.tax_pct, "total_amount": b.total_amount, "payment_method": b.payment_method, "notes": b.notes, "billed_at": str(b.billed_at)}

@router.get("/medicines/lookup")
async def lookup_medicines(q: str = "", current_user: User = Depends(require_role(UserRole.PHARMACIST)), db: AsyncSession = Depends(get_db)):
    """Return medicines matching query for billing autocomplete."""
    query = select(Medicine).where(Medicine.stock > 0)
    if q:
        query = query.where(Medicine.name.ilike(f"%{q}%"))
    result = await db.execute(query.limit(20))
    return [{"id": m.id, "name": m.name, "unit_price": m.unit_price, "stock": m.stock, "category": m.category} for m in result.scalars().all()]
