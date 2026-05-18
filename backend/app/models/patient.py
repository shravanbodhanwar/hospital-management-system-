from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.database import Base

class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    age = Column(Integer)
    gender = Column(String(20))
    blood_group = Column(String(10))
    height_cm = Column(Float)
    weight_kg = Column(Float)
    medical_history = Column(Text, default="")
    allergies = Column(Text, default="")
    emergency_contact = Column(String(20), default="")
    address = Column(Text, default="")

class MedicalReport(Base):
    __tablename__ = "medical_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_type = Column(String(100))  # blood_report, prescription, scan, discharge
    file_path = Column(String(500))
    file_name = Column(String(255))
    ai_summary = Column(Text, default="")
    risk_indicators = Column(JSON, default=list)
    abnormal_values = Column(JSON, default=list)
    recommendations = Column(Text, default="")
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class HealthRiskAssessment(Base):
    __tablename__ = "health_risk_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    diabetes_risk = Column(Float, default=0.0)
    heart_disease_risk = Column(Float, default=0.0)
    hypertension_risk = Column(Float, default=0.0)
    obesity_risk = Column(Float, default=0.0)
    overall_risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="low")  # low, moderate, high, critical
    ai_explanation = Column(Text, default="")
    recommended_specialists = Column(JSON, default=list)
    assessed_at = Column(DateTime(timezone=True), server_default=func.now())
