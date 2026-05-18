from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str  # patient, doctor, pharmacist, admin
    phone: Optional[str] = ""

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    phone: Optional[str] = ""

# --- Patient Schemas ---
class PatientProfileCreate(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    medical_history: Optional[str] = ""
    allergies: Optional[str] = ""
    emergency_contact: Optional[str] = ""
    address: Optional[str] = ""

class HealthRiskInput(BaseModel):
    age: int
    gender: str
    bmi: float
    blood_pressure_systolic: int
    blood_pressure_diastolic: int
    glucose_level: float
    cholesterol: float
    smoking: bool = False
    exercise_hours_per_week: float = 0
    family_history_diabetes: bool = False
    family_history_heart: bool = False

# --- Doctor Schemas ---
class DoctorProfileCreate(BaseModel):
    specialization: str
    experience_years: int = 0
    qualification: str = ""
    hospital: str = "Smart Hospital"
    consultation_fee: float = 500.0
    available_days: List[str] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    available_hours: str = "09:00-17:00"
    bio: str = ""

# --- Appointment Schemas ---
class AppointmentCreate(BaseModel):
    doctor_id: int
    date: str
    time: str = "10:00"
    reason: str = ""

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

# --- Prescription Schemas ---
class MedicineItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str

class PrescriptionCreate(BaseModel):
    patient_id: int
    diagnosis: str = ""
    medicines: List[MedicineItem]
    instructions: str = ""

# --- Medicine Schemas ---
class MedicineCreate(BaseModel):
    name: str
    generic_name: str = ""
    category: str = "General"
    manufacturer: str = ""
    stock: int = 0
    unit_price: float = 0.0
    expiry_date: str = ""
    batch_number: str = ""
    supplier: str = ""
    is_eco_friendly: bool = False
    min_stock_level: int = 10
    description: str = ""

class MedicineUpdate(BaseModel):
    stock: Optional[int] = None
    unit_price: Optional[float] = None
    min_stock_level: Optional[int] = None

# --- Sustainability Schemas ---
class SustainabilityInput(BaseModel):
    date: str
    electricity_kwh: float = 0.0
    water_liters: float = 0.0
    waste_kg: float = 0.0
    medical_waste_kg: float = 0.0
    paper_sheets: int = 0
    ward_occupancy_pct: float = 0.0
    equipment_utilization_pct: float = 0.0
    notes: str = ""

# --- Receptionist Schemas ---
class ReceptionistPatientRegister(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = ""
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    medical_history: Optional[str] = ""
    allergies: Optional[str] = ""
    emergency_contact: Optional[str] = ""
    address: Optional[str] = ""

class ReceptionistAppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    date: str
    time: str = "10:00"
    reason: str = ""

# --- Billing Schemas ---
class BillItem(BaseModel):
    name: str
    qty: int = 1
    unit_price: float = 0.0

class PharmacyBillCreate(BaseModel):
    patient_name: str = "Walk-in"
    patient_id: Optional[int] = None
    prescription_id: Optional[int] = None
    prescription_type: str = "offline"   # online | offline
    items: List[BillItem]
    discount_pct: float = 0.0
    tax_pct: float = 5.0
    payment_method: str = "Cash"
    notes: str = ""

class HospitalBillCreate(BaseModel):
    bill_type: str = "General"
    vendor_name: str = ""
    amount: float = 0.0
    month: str = ""          # YYYY-MM
    description: str = ""
    file_name: str = ""

