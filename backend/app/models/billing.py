from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON, Boolean
from sqlalchemy.sql import func
from app.database import Base

class PharmacyBill(Base):
    __tablename__ = "pharmacy_bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_number = Column(String(50), unique=True)
    patient_name = Column(String(255), default="Walk-in")
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = offline/walk-in
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=True)
    prescription_type = Column(String(20), default="offline")  # online | offline
    items = Column(JSON, default=list)   # [{name, qty, unit_price, total}]
    subtotal = Column(Float, default=0.0)
    discount_pct = Column(Float, default=0.0)
    tax_pct = Column(Float, default=5.0)
    total_amount = Column(Float, default=0.0)
    payment_method = Column(String(50), default="Cash")
    notes = Column(Text, default="")
    billed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    billed_at = Column(DateTime(timezone=True), server_default=func.now())


class HospitalBill(Base):
    """Admin-uploaded bills / invoices for budget tracking."""
    __tablename__ = "hospital_bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_type = Column(String(100), default="General")   # Equipment, Utilities, Salary, Supplies, etc.
    vendor_name = Column(String(255), default="")
    amount = Column(Float, default=0.0)
    month = Column(String(7), default="")   # YYYY-MM
    description = Column(Text, default="")
    file_name = Column(String(255), default="")
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
