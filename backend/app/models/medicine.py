from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Medicine(Base):
    __tablename__ = "medicines"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    generic_name = Column(String(255), default="")
    category = Column(String(100), default="General")
    manufacturer = Column(String(255), default="")
    stock = Column(Integer, default=0)
    unit_price = Column(Float, default=0.0)
    expiry_date = Column(String(20), default="")  # YYYY-MM-DD
    batch_number = Column(String(100), default="")
    supplier = Column(String(255), default="")
    is_eco_friendly = Column(Boolean, default=False)
    min_stock_level = Column(Integer, default=10)
    description = Column(String(500), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class MedicineLog(Base):
    __tablename__ = "medicine_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, nullable=False)
    medicine_name = Column(String(255), default="")
    action = Column(String(50))  # dispensed, restocked, expired, wasted
    quantity = Column(Integer, default=0)
    performed_by = Column(Integer)  # user_id
    notes = Column(String(500), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
