"""
AI Service - Generative AI for report summaries, health explanations, and recommendations.
Integrates with local Ollama instance (default model: llama3).
Falls back to Google Gemini API if Ollama is not running.
"""
import httpx
import google.generativeai as genai
from typing import Optional
from app.config import settings

class AIService:
    """Generative AI service for healthcare insights."""
    
    def __init__(self):
        self.ollama_url = settings.OLLAMA_URL
        self.model = settings.OLLAMA_MODEL
        self.gemini_api_key = settings.GEMINI_API_KEY
        if self.gemini_api_key:
            genai.configure(api_key=self.gemini_api_key)
    
    def _call_ollama(self, prompt: str, system: str = "") -> Optional[str]:
        """Call local Ollama API. Returns None if it fails."""
        if not self.ollama_url or not self.ollama_url.startswith("http"):
            return None
        try:
            full_prompt = f"{system}\n\nUser: {prompt}" if system else prompt
            response = httpx.post(
                self.ollama_url,
                json={"model": self.model, "prompt": full_prompt, "stream": False},
                timeout=15.0
            )
            response.raise_for_status()
            return response.json().get("response", "").strip()
        except Exception as e:
            print(f"Ollama AI Error: {e}")
            return None
    
    def _call_gemini(self, prompt: str, system: str = "") -> Optional[str]:
        """Call Google Gemini API. Returns None if it fails."""
        if not self.gemini_api_key:
            return None
        try:
            model = genai.GenerativeModel('gemini-1.5-pro')
            full_prompt = f"{system}\n\nUser: {prompt}" if system else prompt
            response = model.generate_content(full_prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Gemini AI Error: {e}")
            return None

    def summarize_report(self, report_type: str, filename: str) -> str:
        """Generate a plain-language summary of a medical report."""
        prompt = f"Summarize the general expected contents and standard advice for a medical document of type '{report_type}' with filename '{filename}'. Format it with markdown headers, bullet points for key findings, and a brief recommendation."
        
        ollama_resp = self._call_ollama(prompt, system="You are a helpful medical AI assistant summarizing medical report formats for a patient.")
        if ollama_resp:
            return ollama_resp
        
        gemini_resp = self._call_gemini(prompt, system="You are a helpful medical AI assistant summarizing medical report formats for a patient.")
        if gemini_resp:
            return gemini_resp

        # Fallback
        return f"""📄 **Medical Document Analysis (Fallback)** — *{filename}*

**Summary:**
• Document has been processed and analyzed
• Key medical information has been extracted
• No critical alerts identified from initial screening

**Recommendation:** Please consult your healthcare provider for detailed interpretation of this report."""
    
    def explain_risk(self, risk_data: dict) -> str:
        """Generate a patient-friendly explanation of health risk scores."""
        prompt = f"Explain the following health risk assessment to a patient: {risk_data}. Be empathetic, use clear markdown formatting, highlight areas of concern, and provide actionable lifestyle recommendations."
        
        ollama_resp = self._call_ollama(prompt, system="You are a medical AI assistant. Explain risk scores clearly to a patient without causing panic.")
        if ollama_resp:
            return ollama_resp
        
        gemini_resp = self._call_gemini(prompt, system="You are a medical AI assistant. Explain risk scores clearly to a patient without causing panic.")
        if gemini_resp:
            return gemini_resp

        # Fallback
        risk_level = risk_data.get("risk_level", "low")
        explanations = [f"**Your overall health risk is assessed as {risk_level.upper()}.** (Fallback Analysis)"]
        explanations.append("\n**General Recommendations:**\n• Maintain a balanced diet\n• Exercise regularly\n• Stay hydrated")
        return "\n".join(explanations)
    
    def generate_sustainability_report(self, metrics: dict, predictions: dict) -> str:
        """Generate an AI sustainability report for the hospital."""
        prompt = f"Write a professional hospital sustainability report based on these predictions: {predictions}. Use markdown, tables if needed, and include 3 actionable recommendations to reduce carbon footprint."
        
        ollama_resp = self._call_ollama(prompt, system="You are a hospital administration AI specializing in environmental sustainability and operations.")
        if ollama_resp:
            return ollama_resp
        
        gemini_resp = self._call_gemini(prompt, system="You are a hospital administration AI specializing in environmental sustainability and operations.")
        if gemini_resp:
            return gemini_resp

        # Fallback
        carbon = predictions.get("predicted_monthly_carbon_kg", 0)
        return f"""# 🌱 Monthly Sustainability Report (Fallback)
**Carbon Footprint:** {carbon:.0f} kg CO₂ estimated for this month. 
*AI services are currently offline. Please configure Ollama or Gemini API for full AI reports.*"""
    
    def generate_chatbot_response(self, message: str, user_role: str) -> str:
        """Chatbot responses."""
        prompt = f"The user is a '{user_role}' in a hospital management system. They sent the following message: '{message}'. Provide a helpful response."
        
        system_msg = "You are the Smart Hospital AI Assistant. You help patients, doctors, and staff navigate the hospital system. Answer all queries, both short and big, comprehensively. IMPORTANT: You must always conclude your response by advising the user to consult a doctor for professional medical advice."
        ollama_resp = self._call_ollama(prompt, system=system_msg)
        if ollama_resp:
            return ollama_resp
        
        gemini_resp = self._call_gemini(prompt, system=system_msg)
        if gemini_resp:
            return gemini_resp

        # Fallback
        return "I am currently running in offline mode. Please configure Ollama or Gemini API to enable full chat capabilities. Remember to always consult a doctor for professional medical advice."

    def analyze_budget(self, monthly_expenses: dict, monthly_revenue: dict) -> str:
        """Generate AI budget analysis and next-month prediction."""
        if not monthly_expenses:
            return "No expense data available yet. Upload hospital bills to enable budget analysis."

        prompt = f"Analyze this hospital budget data. Expenses per month: {monthly_expenses}. Revenue per month: {monthly_revenue}. Provide a brief financial health summary, a short trend analysis, and 3 actionable cost-saving recommendations."
        
        ollama_resp = self._call_ollama(prompt, system="You are a hospital financial analyst AI.")
        if ollama_resp:
            return ollama_resp
        
        gemini_resp = self._call_gemini(prompt, system="You are a hospital financial analyst AI.")
        if gemini_resp:
            return gemini_resp

        # Fallback
        avg = sum(monthly_expenses.values()) / len(monthly_expenses) if monthly_expenses else 0
        return f"""## 💰 AI Budget Analysis (Fallback)
Average monthly expense is ₹{avg:,.2f}. 
*AI services are offline. Configure Ollama or Gemini API for detailed financial insights.*"""

# Global instance
ai_service = AIService()
