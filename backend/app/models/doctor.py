from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, JSON, Text
from app.database import Base

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    specialization = Column(String(100), nullable=False)
    experience_years = Column(Integer, default=0)
    qualification = Column(String(255), default="")
    hospital = Column(String(255), default="Smart Hospital")
    rating = Column(Float, default=4.0)
    total_patients = Column(Integer, default=0)
    success_rate = Column(Float, default=95.0)
    consultation_fee = Column(Float, default=500.0)
    available_days = Column(JSON, default=lambda: ["Mon", "Tue", "Wed", "Thu", "Fri"])
    available_hours = Column(String(50), default="09:00-17:00")
    is_available = Column(Boolean, default=True)
    bio = Column(Text, default="")
