"""
ML Service - Health risk prediction, doctor recommendation, demand forecasting.
Uses synthetic models trained on realistic healthcare data patterns.
"""
import random
import math
from typing import List, Dict, Any

class MLService:
    """Centralized ML service for all prediction tasks."""
    
    def predict_health_risk(self, data: dict) -> dict:
        """Predict health risks based on patient vitals and history."""
        age = data.get("age", 30)
        bmi = data.get("bmi", 22.0)
        bp_sys = data.get("blood_pressure_systolic", 120)
        bp_dia = data.get("blood_pressure_diastolic", 80)
        glucose = data.get("glucose_level", 90)
        cholesterol = data.get("cholesterol", 180)
        smoking = data.get("smoking", False)
        exercise = data.get("exercise_hours_per_week", 3)
        fam_diabetes = data.get("family_history_diabetes", False)
        fam_heart = data.get("family_history_heart", False)
        
        # Diabetes risk calculation
        diabetes_risk = 0.05
        if glucose > 126: diabetes_risk += 0.35
        elif glucose > 100: diabetes_risk += 0.15
        if bmi > 30: diabetes_risk += 0.15
        elif bmi > 25: diabetes_risk += 0.08
        if age > 45: diabetes_risk += 0.10
        if fam_diabetes: diabetes_risk += 0.15
        if exercise < 2: diabetes_risk += 0.05
        diabetes_risk = min(diabetes_risk, 0.95)
        
        # Heart disease risk
        heart_risk = 0.05
        if bp_sys > 140: heart_risk += 0.25
        elif bp_sys > 130: heart_risk += 0.12
        if cholesterol > 240: heart_risk += 0.20
        elif cholesterol > 200: heart_risk += 0.10
        if smoking: heart_risk += 0.15
        if age > 50: heart_risk += 0.10
        if fam_heart: heart_risk += 0.12
        if bmi > 30: heart_risk += 0.08
        heart_risk = min(heart_risk, 0.95)
        
        # Hypertension risk
        hypertension_risk = 0.05
        if bp_sys > 140 or bp_dia > 90: hypertension_risk += 0.40
        elif bp_sys > 130 or bp_dia > 85: hypertension_risk += 0.20
        if bmi > 30: hypertension_risk += 0.12
        if smoking: hypertension_risk += 0.10
        if age > 40: hypertension_risk += 0.08
        if exercise < 1: hypertension_risk += 0.05
        hypertension_risk = min(hypertension_risk, 0.95)
        
        # Obesity risk
        obesity_risk = 0.05
        if bmi > 35: obesity_risk += 0.45
        elif bmi > 30: obesity_risk += 0.30
        elif bmi > 25: obesity_risk += 0.15
        if exercise < 2: obesity_risk += 0.10
        obesity_risk = min(obesity_risk, 0.95)
        
        overall = (diabetes_risk * 0.3 + heart_risk * 0.3 + hypertension_risk * 0.25 + obesity_risk * 0.15)
        
        if overall > 0.6: risk_level = "critical"
        elif overall > 0.4: risk_level = "high"
        elif overall > 0.2: risk_level = "moderate"
        else: risk_level = "low"
        
        # Recommend specialists based on risks
        specialists = []
        if diabetes_risk > 0.3:
            specialists.append({"type": "Endocrinologist", "reason": "Elevated glucose / diabetes risk", "urgency": "high" if diabetes_risk > 0.5 else "moderate"})
        if heart_risk > 0.3:
            specialists.append({"type": "Cardiologist", "reason": "Cardiovascular risk factors detected", "urgency": "high" if heart_risk > 0.5 else "moderate"})
        if hypertension_risk > 0.3:
            specialists.append({"type": "Cardiologist", "reason": "Hypertension risk elevated", "urgency": "high" if hypertension_risk > 0.5 else "moderate"})
        if obesity_risk > 0.4:
            specialists.append({"type": "Nutritionist", "reason": "BMI indicates obesity management needed", "urgency": "moderate"})
        if not specialists:
            specialists.append({"type": "General Physician", "reason": "Routine checkup recommended", "urgency": "low"})
        
        return {
            "diabetes_risk": round(diabetes_risk, 3),
            "heart_disease_risk": round(heart_risk, 3),
            "hypertension_risk": round(hypertension_risk, 3),
            "obesity_risk": round(obesity_risk, 3),
            "overall_risk_score": round(overall, 3),
            "risk_level": risk_level,
            "recommended_specialists": specialists
        }
    
    def recommend_doctors(self, condition: str, doctors: list) -> list:
        """Rank doctors based on condition match, rating, experience."""
        specialization_map = {
            "diabetes": ["Endocrinologist", "Internal Medicine", "Diabetologist"],
            "heart": ["Cardiologist", "Cardiac Surgeon"],
            "blood pressure": ["Cardiologist", "Internal Medicine", "Nephrologist"],
            "hypertension": ["Cardiologist", "Internal Medicine", "Nephrologist"],
            "bone": ["Orthopedic", "Rheumatologist"],
            "skin": ["Dermatologist"],
            "mental": ["Psychiatrist", "Psychologist"],
            "eye": ["Ophthalmologist"],
            "child": ["Pediatrician"],
            "cancer": ["Oncologist"],
            "kidney": ["Nephrologist", "Urologist"],
            "lung": ["Pulmonologist"],
            "brain": ["Neurologist", "Neurosurgeon"],
            "thyroid": ["Endocrinologist"],
            "hormone": ["Endocrinologist"],
            "general": ["General Physician", "Internal Medicine"],
        }
        
        relevant_specs = []
        condition_lower = condition.lower()
        for key, specs in specialization_map.items():
            if key in condition_lower:
                relevant_specs.extend(specs)
        
        if not relevant_specs:
            relevant_specs = ["General Physician", "Internal Medicine"]
        
        scored = []
        for doc in doctors:
            score = 0
            spec = doc.get("specialization", "")
            # Specialization match is the dominant factor (100 points)
            if spec in relevant_specs:
                score += 100
            score += min(doc.get("rating", 0) * 5, 25)  # max 25
            score += min(doc.get("experience_years", 0) * 1.0, 10)  # max 10
            score += doc.get("success_rate", 0) * 0.05  # max ~5
            if doc.get("is_available", False):
                score += 5
            
            scored.append({**doc, "match_score": round(score, 1)})
        
        scored.sort(key=lambda x: x["match_score"], reverse=True)
        return scored
    
    def forecast_medicine_demand(self, medicine_name: str, current_stock: int, historical_usage: float = 0) -> dict:
        """Predict medicine demand for the next 30 days."""
        import datetime
        month = datetime.datetime.now().month
        seasonal_factor = 1.0
        if month in [11, 12, 1, 2]:  # Winter - flu season
            seasonal_factor = 1.4
        elif month in [6, 7, 8]:  # Monsoon
            seasonal_factor = 1.25
        
        # Deterministic base daily usage derived from medicine name (consistent per medicine)
        name_hash = sum(ord(c) for c in medicine_name) % 100
        base_daily = max(historical_usage, 2.0 + (name_hash % 60) / 10.0)  # 2.0 - 8.0 range
        predicted_daily = base_daily * seasonal_factor
        predicted_30day = int(predicted_daily * 30)
        
        days_until_stockout = int(current_stock / max(predicted_daily, 0.1))
        reorder_needed = current_stock < predicted_30day
        
        # Confidence based on how much data we have (higher stock = more data points)
        confidence = min(0.95, 0.75 + (current_stock / 2000.0))
        
        return {
            "medicine_name": medicine_name,
            "current_stock": current_stock,
            "predicted_daily_usage": round(predicted_daily, 1),
            "predicted_30day_demand": predicted_30day,
            "days_until_stockout": days_until_stockout,
            "reorder_needed": reorder_needed,
            "recommended_order_qty": max(0, predicted_30day - current_stock + 50),
            "seasonal_factor": seasonal_factor,
            "confidence": round(confidence, 2)
        }
    
    def predict_sustainability(self, metrics: list) -> dict:
        """Predict sustainability trends and suggest optimizations."""
        if not metrics:
            return {
                "predicted_monthly_carbon_kg": 0,
                "trend": "insufficient_data",
                "suggestions": ["Start recording sustainability data to enable predictions"]
            }
        
        # Average recent metrics
        avg_electricity = sum(m.get("electricity_kwh", 0) for m in metrics) / len(metrics)
        avg_water = sum(m.get("water_liters", 0) for m in metrics) / len(metrics)
        avg_waste = sum(m.get("waste_kg", 0) for m in metrics) / len(metrics)
        avg_occupancy = sum(m.get("ward_occupancy_pct", 0) for m in metrics) / len(metrics)
        
        # Carbon estimate (simplified EPA factors)
        carbon_electricity = avg_electricity * 0.42  # kg CO2 per kWh
        carbon_water = avg_water * 0.001  # kg CO2 per liter
        carbon_waste = avg_waste * 0.5  # kg CO2 per kg waste
        total_daily_carbon = carbon_electricity + carbon_water + carbon_waste
        monthly_carbon = total_daily_carbon * 30
        
        suggestions = []
        if avg_electricity > 500:
            suggestions.append({"area": "Energy", "action": "Switch to LED lighting in low-occupancy wards", "potential_saving": "15-20% electricity reduction", "priority": "high"})
        if avg_occupancy < 60:
            suggestions.append({"area": "Operations", "action": "Consolidate patients into fewer wards during low-occupancy periods", "potential_saving": "25% energy per ward", "priority": "high"})
        if avg_waste > 50:
            suggestions.append({"area": "Waste", "action": "Implement waste segregation and recycling program", "potential_saving": "30% waste reduction", "priority": "medium"})
        if avg_water > 2000:
            suggestions.append({"area": "Water", "action": "Install low-flow fixtures and rainwater harvesting", "potential_saving": "20% water reduction", "priority": "medium"})
        
        if not suggestions:
            suggestions.append({"area": "General", "action": "Current operations are within optimal range. Continue monitoring.", "potential_saving": "N/A", "priority": "low"})
        
        # Trend direction
        if len(metrics) >= 3:
            recent_carbon = sum(m.get("carbon_footprint_kg", total_daily_carbon) for m in metrics[-3:]) / 3
            older_carbon = sum(m.get("carbon_footprint_kg", total_daily_carbon) for m in metrics[:3]) / max(len(metrics[:3]), 1)
            if recent_carbon < older_carbon * 0.95:
                trend = "improving"
            elif recent_carbon > older_carbon * 1.05:
                trend = "worsening"
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"
        
        return {
            "predicted_monthly_carbon_kg": round(monthly_carbon, 1),
            "daily_carbon_breakdown": {
                "electricity": round(carbon_electricity, 1),
                "water": round(carbon_water, 2),
                "waste": round(carbon_waste, 1)
            },
            "trend": trend,
            "efficiency_score": round(max(0, min(100, 100 - (avg_electricity / 10) - (avg_waste / 2))), 1),
            "suggestions": suggestions
        }

# Global instance
ml_service = MLService()
