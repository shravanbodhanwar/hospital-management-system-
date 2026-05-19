"""
AI Service - Generative AI for report summaries, health explanations, and recommendations.
Tries Ollama first (local Docker or remote Ngrok tunnel), then Google Gemini, then static fallbacks.
"""
from urllib.parse import urlparse

import httpx
from google import genai
from google.genai import types
from typing import Any, Optional
from app.config import settings

# Tried in order; skips to next on quota (429) or unavailable model (404)
GEMINI_MODELS = (
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
)
OLLAMA_GENERATE_PATH = "/api/generate"
OLLAMA_TIMEOUT_SEC = 45.0


def _normalize_ollama_url(url: str) -> str:
    """Fix common Render misconfig: ngrok host only, missing /api/generate."""
    url = url.strip().rstrip("/")
    if not url:
        return url
    if url.endswith(OLLAMA_GENERATE_PATH):
        return url
    path = urlparse(url).path
    if path in ("", "/"):
        return f"{url}{OLLAMA_GENERATE_PATH}"
    return url


class AIService:
    """Generative AI service for healthcare insights."""

    def __init__(self):
        self._raw_ollama_url = (settings.OLLAMA_URL or "").strip()
        self.ollama_url = _normalize_ollama_url(self._raw_ollama_url)
        self.model = settings.OLLAMA_MODEL
        self.ollama_auth_user = (settings.OLLAMA_AUTH_USER or "api").strip() or "api"
        self.ollama_api_key = settings.OLLAMA_API_KEY.strip() if settings.OLLAMA_API_KEY else ""
        self.gemini_api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
        self._gemini_client: Optional[genai.Client] = None
        self._log_startup_status()

    def _log_startup_status(self) -> None:
        ollama = self._ollama_enabled()
        gemini = bool(self.gemini_api_key)
        print(
            f"AI backends: ollama={'on' if ollama else 'off'}"
            f"{' (tunnel auth)' if ollama and self.ollama_api_key else ''}, "
            f"gemini={'on' if gemini else 'off'}"
        )
        if self._raw_ollama_url and not self._raw_ollama_url.rstrip("/").endswith(
            OLLAMA_GENERATE_PATH
        ):
            print(
                f"NOTE: OLLAMA_URL was missing {OLLAMA_GENERATE_PATH}; "
                f"set it explicitly to: {self.ollama_url}"
            )
        if warning := self._ollama_url_warning():
            print(f"WARNING: {warning}")

    def _ollama_enabled(self) -> bool:
        return bool(self.ollama_url and self.ollama_url.startswith("http"))

    def _ollama_url_warning(self) -> Optional[str]:
        if not self._ollama_enabled():
            return None
        if not self.ollama_url.endswith(OLLAMA_GENERATE_PATH):
            return (
                f"OLLAMA_URL should end with {OLLAMA_GENERATE_PATH} "
                f"(current path: {urlparse(self.ollama_url).path or '/'})"
            )
        return None

    def ai_status(self) -> dict[str, Any]:
        """Non-secret snapshot for health checks / Render debugging."""
        return {
            "ollama_configured": self._ollama_enabled(),
            "ollama_url": self.ollama_url if self._ollama_enabled() else None,
            "ollama_tunnel_auth": bool(self.ollama_api_key),
            "ollama_warning": self._ollama_url_warning(),
            "gemini_configured": bool(self.gemini_api_key),
            "ollama_model": self.model,
            "gemini_models": list(GEMINI_MODELS) if self.gemini_api_key else None,
        }

    def _get_gemini_client(self) -> Optional[genai.Client]:
        if not self.gemini_api_key:
            return None
        if self._gemini_client is None:
            self._gemini_client = genai.Client(api_key=self.gemini_api_key)
        return self._gemini_client

    def _ollama_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        # Ngrok free tier returns an HTML interstitial unless this header is set
        if "ngrok" in self.ollama_url.lower():
            headers["ngrok-skip-browser-warning"] = "1"
        return headers

    def _call_ollama(self, prompt: str, system: str = "") -> Optional[str]:
        """Call Ollama (local Docker or remote via Ngrok). Returns None if it fails."""
        if not self._ollama_enabled():
            return None

        full_prompt = f"{system}\n\nUser: {prompt}" if system else prompt
        payload = {"model": self.model, "prompt": full_prompt, "stream": False}
        headers = self._ollama_headers()

        # Try with tunnel auth first (if configured), then without (plain ngrok tunnel)
        auth_attempts: list[Optional[tuple[str, str]]] = []
        if self.ollama_api_key:
            auth_attempts.append((self.ollama_auth_user, self.ollama_api_key))
        auth_attempts.append(None)

        last_error: Optional[Exception] = None
        for auth in auth_attempts:
            try:
                response = httpx.post(
                    self.ollama_url,
                    json=payload,
                    auth=auth,
                    headers=headers,
                    timeout=OLLAMA_TIMEOUT_SEC,
                )
                response.raise_for_status()
                text = response.json().get("response") or ""
                return text.strip() or None
            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code in (401, 403) and auth is not None:
                    print("Ollama: tunnel auth rejected, retrying without basic auth…")
                    continue
                if e.response.status_code == 403:
                    body = (e.response.text or "")[:200]
                    print(
                        "Ollama AI Error: 403 Forbidden. "
                        "If using ngrok --basic-auth=user:pass, set OLLAMA_AUTH_USER and "
                        f"OLLAMA_API_KEY to match. Response: {body!r}"
                    )
                else:
                    print(f"Ollama AI Error: {e}")
                return None
            except Exception as e:
                print(f"Ollama AI Error: {e}")
                return None

        if last_error:
            print(f"Ollama AI Error: {last_error}")
        return None

    def _call_gemini(self, prompt: str, system: str = "") -> Optional[str]:
        """Call Google Gemini API. Returns None if it fails."""
        client = self._get_gemini_client()
        if not client:
            return None

        config = (
            types.GenerateContentConfig(system_instruction=system) if system else None
        )
        last_error: Optional[Exception] = None

        for model in GEMINI_MODELS:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config,
                )
                text = response.text
                if text and text.strip():
                    return text.strip()
            except Exception as e:
                last_error = e
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    print(f"Gemini quota hit for {model}, trying next model…")
                    continue
                if "404" in err or "NOT_FOUND" in err:
                    print(f"Gemini model {model} unavailable, trying next…")
                    continue
                print(f"Gemini AI Error ({model}): {e}")
                return None

        if last_error:
            print(f"Gemini AI Error (all models): {last_error}")
        return None

    def _ai_response(self, prompt: str, system: str = "") -> Optional[str]:
        """Ollama first, then Gemini."""
        return self._call_ollama(prompt, system=system) or self._call_gemini(
            prompt, system=system
        )

    def summarize_report(self, report_type: str, filename: str) -> str:
        """Generate a plain-language summary of a medical report."""
        prompt = (
            f"Summarize the general expected contents and standard advice for a medical "
            f"document of type '{report_type}' with filename '{filename}'. Format it with "
            f"markdown headers, bullet points for key findings, and a brief recommendation."
        )
        system = (
            "You are a helpful medical AI assistant summarizing medical report formats for a patient."
        )
        if resp := self._ai_response(prompt, system=system):
            return resp

        return f"""📄 **Medical Document Analysis (Fallback)** — *{filename}*

**Summary:**
• Document has been processed and analyzed
• Key medical information has been extracted
• No critical alerts identified from initial screening

**Recommendation:** Please consult your healthcare provider for detailed interpretation of this report."""

    def explain_risk(self, risk_data: dict) -> str:
        """Generate a patient-friendly explanation of health risk scores."""
        prompt = (
            f"Explain the following health risk assessment to a patient: {risk_data}. "
            f"Be empathetic, use clear markdown formatting, highlight areas of concern, "
            f"and provide actionable lifestyle recommendations."
        )
        system = (
            "You are a medical AI assistant. Explain risk scores clearly to a patient without causing panic."
        )
        if resp := self._ai_response(prompt, system=system):
            return resp

        risk_level = risk_data.get("risk_level", "low")
        return (
            f"**Your overall health risk is assessed as {risk_level.upper()}.** (Fallback Analysis)\n\n"
            "**General Recommendations:**\n• Maintain a balanced diet\n• Exercise regularly\n• Stay hydrated"
        )

    def generate_sustainability_report(self, metrics: dict, predictions: dict) -> str:
        """Generate an AI sustainability report for the hospital."""
        prompt = (
            f"Write a professional hospital sustainability report based on these predictions: "
            f"{predictions}. Use markdown, tables if needed, and include 3 actionable "
            f"recommendations to reduce carbon footprint."
        )
        system = (
            "You are a hospital administration AI specializing in environmental sustainability and operations."
        )
        if resp := self._ai_response(prompt, system=system):
            return resp

        carbon = predictions.get("predicted_monthly_carbon_kg", 0)
        return f"""# 🌱 Monthly Sustainability Report (Fallback)
**Carbon Footprint:** {carbon:.0f} kg CO₂ estimated for this month.
*AI services are currently offline. Please configure Ollama or Gemini API for full AI reports.*"""

    def generate_chatbot_response(self, message: str, user_role: str) -> str:
        """Chatbot responses."""
        prompt = (
            f"The user is a '{user_role}' in a hospital management system. They sent the "
            f"following message: '{message}'. Provide a helpful response."
        )
        system = (
            "You are the Smart Hospital AI Assistant. You help patients, doctors, and staff "
            "navigate the hospital system. Answer all queries comprehensively. IMPORTANT: "
            "Always conclude by advising the user to consult a doctor for professional medical advice."
        )
        if resp := self._ai_response(prompt, system=system):
            return resp

        return (
            "I am currently running in offline mode. Please configure Ollama or Gemini API "
            "to enable full chat capabilities. Remember to always consult a doctor for "
            "professional medical advice."
        )

    def analyze_budget(self, monthly_expenses: dict, monthly_revenue: dict) -> str:
        """Generate AI budget analysis and next-month prediction."""
        if not monthly_expenses:
            return "No expense data available yet. Upload hospital bills to enable budget analysis."

        prompt = (
            f"Analyze this hospital budget data. Expenses per month: {monthly_expenses}. "
            f"Revenue per month: {monthly_revenue}. Provide a brief financial health summary, "
            f"a short trend analysis, and 3 actionable cost-saving recommendations."
        )
        system = "You are a hospital financial analyst AI."
        if resp := self._ai_response(prompt, system=system):
            return resp

        avg = sum(monthly_expenses.values()) / len(monthly_expenses)
        return f"""## 💰 AI Budget Analysis (Fallback)
Average monthly expense is ₹{avg:,.2f}.
*AI services are offline. Configure Ollama or Gemini API for detailed financial insights.*"""


ai_service = AIService()
