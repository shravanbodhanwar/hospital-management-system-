from sqlalchemy import Column, Integer, Float, String, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class SustainabilityMetric(Base):
    __tablename__ = "sustainability_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(20), nullable=False)  # YYYY-MM-DD
    electricity_kwh = Column(Float, default=0.0)
    water_liters = Column(Float, default=0.0)
    waste_kg = Column(Float, default=0.0)
    medical_waste_kg = Column(Float, default=0.0)
    paper_sheets = Column(Integer, default=0)
    ward_occupancy_pct = Column(Float, default=0.0)
    equipment_utilization_pct = Column(Float, default=0.0)
    carbon_footprint_kg = Column(Float, default=0.0)
    notes = Column(Text, default="")
    recorded_by = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SustainabilityGoal(Base):
    __tablename__ = "sustainability_goals"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(100), nullable=False)
    target_value = Column(Float, default=0.0)
    current_value = Column(Float, default=0.0)
    unit = Column(String(50), default="")
    period = Column(String(20), default="monthly")  # weekly, monthly, quarterly
    status = Column(String(20), default="in_progress")  # in_progress, achieved, missed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
