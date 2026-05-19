import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Smart Hospital Platform"
    SECRET_KEY: str = "super-secret-hospital-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    DATABASE_URL: str = "sqlite+aiosqlite:///./hospital.db"
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    GEMINI_API_KEY: str = ""
    OLLAMA_URL: str = "http://localhost:11434/api/generate"
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_AUTH_USER: str = "api"  # Ngrok / tunnel HTTP basic-auth username
    OLLAMA_API_KEY: str = ""  # Ngrok / tunnel HTTP basic-auth password
    CORS_ORIGINS: str = "http://localhost:8080,http://127.0.0.1:8080,http://localhost,http://localhost:80"

    class Config:
        env_file = ".env"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
