from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.database import Base

class Prescription(Base):
    __tablename__ = "prescriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_name = Column(String(255), default="")
    doctor_name = Column(String(255), default="")
    diagnosis = Column(Text, default="")
    medicines = Column(JSON, default=list)  # [{name, dosage, frequency, duration}]
    instructions = Column(Text, default="")
    is_dispensed = Column(Integer, default=0)  # 0=pending, 1=dispensed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
