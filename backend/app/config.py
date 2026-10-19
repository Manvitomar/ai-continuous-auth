from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="allow")

    PROJECT_NAME: str = "AI-Based Continuous Authentication"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "academic-continuous-auth-super-secret-key-change-in-prod-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # SQLite Database URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./continuous_auth.db")
    
    # Biometrics & Risk Engine Parameters
    MIN_ENROLLMENT_SAMPLES: int = 15
    RISK_WINDOW_SIZE_EVENTS: int = 25
    RISK_EMA_ALPHA: float = 0.35  # Exponential moving average smoothing factor
    
    # Risk Thresholds
    RISK_LOW_THRESHOLD: float = 40.0       # <= 40: Normal
    RISK_MEDIUM_THRESHOLD: float = 70.0    # 40 < x <= 70: Elevated monitoring / prompt
    RISK_HIGH_THRESHOLD: float = 70.0      # > 70: Critical anomaly / MFA challenge required
    
    # CORS (Wildcard for seamless cloud deployment on Render/Vercel)
    BACKEND_CORS_ORIGINS: List[str] = [
        "*",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

settings = Settings()
