from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import init_db
from app.config import settings
from app.routers import auth, patients, doctors, pharmacy, admin, receptionist
from app.services.ai_service import ai_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await seed_demo_data()
    yield
    # Shutdown

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Smart Hospital Sustainability & Healthcare Management Platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(pharmacy.router)
app.include_router(admin.router)
app.include_router(receptionist.router)

# Chatbot endpoint (role-agnostic)
from fastapi import Depends
from app.utils.security import get_current_user
from app.models.user import User
from pydantic import BaseModel

class ChatMessage(BaseModel):
    message: str

@app.post("/api/chatbot")
async def chatbot(data: ChatMessage, current_user: User = Depends(get_current_user)):
    response = ai_service.generate_chatbot_response(data.message, current_user.role.value)
    return {"response": response}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}

# Serve frontend static files
import os
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

async def seed_demo_data():
    """Seed demo data if database is empty."""
    from app.database import async_session
    from app.models.user import User, UserRole
    from app.models.doctor import DoctorProfile
    from app.models.medicine import Medicine
    from app.models.sustainability import SustainabilityMetric
    from app.utils.security import hash_password
    from sqlalchemy import select, func
    
    async with async_session() as db:
        count = (await db.execute(select(func.count()).select_from(User))).scalar()
        if count and count > 0:
            return
        
        # Create demo users
        users = [
            User(email="patient@demo.com", password_hash=hash_password("password123"), full_name="Rahul Sharma", role=UserRole.PATIENT, phone="9876543210"),
            User(email="doctor@demo.com", password_hash=hash_password("password123"), full_name="Dr. Priya Patel", role=UserRole.DOCTOR, phone="9876543211"),
            User(email="doctor2@demo.com", password_hash=hash_password("password123"), full_name="Dr. Amit Gupta", role=UserRole.DOCTOR, phone="9876543212"),
            User(email="doctor3@demo.com", password_hash=hash_password("password123"), full_name="Dr. Sneha Reddy", role=UserRole.DOCTOR, phone="9876543213"),
            User(email="pharmacist@demo.com", password_hash=hash_password("password123"), full_name="Vikram Singh", role=UserRole.PHARMACIST, phone="9876543214"),
            User(email="receptionist@demo.com", password_hash=hash_password("password123"), full_name="Anita Desai", role=UserRole.RECEPTIONIST, phone="9876543216"),
            User(email="admin@demo.com", password_hash=hash_password("password123"), full_name="Admin User", role=UserRole.ADMIN, phone="9876543217"),
        ]
        for u in users:
            db.add(u)
        await db.commit()
        
        # Doctor profiles
        doctors_data = [
            DoctorProfile(user_id=2, specialization="Cardiologist", experience_years=12, qualification="MD, DM Cardiology", rating=4.8, total_patients=1500, success_rate=96.5, consultation_fee=800, bio="Leading cardiologist with expertise in interventional cardiology and heart failure management."),
            DoctorProfile(user_id=3, specialization="Endocrinologist", experience_years=8, qualification="MD, DM Endocrinology", rating=4.6, total_patients=980, success_rate=94.2, consultation_fee=700, bio="Specializes in diabetes management, thyroid disorders, and hormonal imbalances."),
            DoctorProfile(user_id=4, specialization="General Physician", experience_years=15, qualification="MBBS, MD Internal Medicine", rating=4.9, total_patients=3200, success_rate=97.1, consultation_fee=500, bio="Experienced general physician with a holistic approach to patient care."),
        ]
        for d in doctors_data:
            db.add(d)
        
        # Patient profile
        from app.models.patient import PatientProfile
        db.add(PatientProfile(user_id=1, age=35, gender="Male", blood_group="B+", height_cm=175, weight_kg=78, medical_history="Mild hypertension", allergies="Penicillin", emergency_contact="9876543220"))
        
        # Medicines
        medicines = [
            Medicine(name="Paracetamol 500mg", generic_name="Acetaminophen", category="Analgesic", manufacturer="Cipla", stock=500, unit_price=2.5, expiry_date="2027-06-15", batch_number="PCM2024A", supplier="MedSupply Co", is_eco_friendly=True, min_stock_level=50),
            Medicine(name="Amoxicillin 250mg", generic_name="Amoxicillin", category="Antibiotic", manufacturer="Sun Pharma", stock=200, unit_price=8.0, expiry_date="2027-03-20", batch_number="AMX2024B", supplier="PharmaDist", min_stock_level=30),
            Medicine(name="Metformin 500mg", generic_name="Metformin HCl", category="Antidiabetic", manufacturer="USV", stock=350, unit_price=3.5, expiry_date="2027-09-10", batch_number="MET2024C", supplier="MedSupply Co", is_eco_friendly=True, min_stock_level=40),
            Medicine(name="Amlodipine 5mg", generic_name="Amlodipine Besylate", category="Antihypertensive", manufacturer="Torrent", stock=180, unit_price=5.0, expiry_date="2027-04-25", batch_number="AML2024D", supplier="HealthDist", min_stock_level=25),
            Medicine(name="Omeprazole 20mg", generic_name="Omeprazole", category="Antacid", manufacturer="Dr. Reddys", stock=400, unit_price=4.0, expiry_date="2027-07-30", batch_number="OMP2024E", supplier="PharmaDist", is_eco_friendly=True, min_stock_level=35),
            Medicine(name="Azithromycin 500mg", generic_name="Azithromycin", category="Antibiotic", manufacturer="Alkem", stock=150, unit_price=12.0, expiry_date="2027-02-14", batch_number="AZI2024F", supplier="MedSupply Co", min_stock_level=20),
            Medicine(name="Atorvastatin 10mg", generic_name="Atorvastatin Calcium", category="Statin", manufacturer="Pfizer", stock=280, unit_price=6.5, expiry_date="2027-08-18", batch_number="ATV2024G", supplier="GlobalPharma", min_stock_level=30),
            Medicine(name="Cetirizine 10mg", generic_name="Cetirizine HCl", category="Antihistamine", manufacturer="Cipla", stock=600, unit_price=1.5, expiry_date="2027-11-22", batch_number="CTZ2024H", supplier="MedSupply Co", is_eco_friendly=True, min_stock_level=50),
            Medicine(name="Ibuprofen 400mg", generic_name="Ibuprofen", category="NSAID", manufacturer="Abbott", stock=320, unit_price=3.0, expiry_date="2027-05-10", batch_number="IBU2024I", supplier="HealthDist", min_stock_level=40),
            Medicine(name="Pantoprazole 40mg", generic_name="Pantoprazole Sodium", category="Antacid", manufacturer="Sun Pharma", stock=8, unit_price=5.5, expiry_date="2026-08-01", batch_number="PAN2024J", supplier="PharmaDist", min_stock_level=25),
        ]
        for m in medicines:
            db.add(m)
        
        # Sustainability data (last 7 days)
        from datetime import date, timedelta
        import random
        for i in range(7):
            d = (date.today() - timedelta(days=i)).isoformat()
            elec = random.uniform(400, 700)
            water = random.uniform(1500, 3000)
            waste = random.uniform(30, 80)
            med_waste = random.uniform(5, 20)
            carbon = elec * 0.42 + water * 0.001 + waste * 0.5 + med_waste * 1.2
            db.add(SustainabilityMetric(date=d, electricity_kwh=round(elec, 1), water_liters=round(water, 1), waste_kg=round(waste, 1), medical_waste_kg=round(med_waste, 1), paper_sheets=random.randint(100, 500), ward_occupancy_pct=round(random.uniform(50, 95), 1), equipment_utilization_pct=round(random.uniform(60, 90), 1), carbon_footprint_kg=round(carbon, 2), recorded_by=7))
        
        await db.commit()
        print("[OK] Demo data seeded successfully!")
