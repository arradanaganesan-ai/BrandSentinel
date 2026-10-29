from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "BrandSentinel"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "brandsentinel-super-secret-production-grade-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # SQLite default with async support; can be overridden by DATABASE_URL (e.g. postgresql+asyncpg://...)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./brandsentinel.db")
    
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "DEMO")  # DEMO, OPENAI, ANTHROPIC, GEMINI
    AI_API_KEY: Optional[str] = os.getenv("AI_API_KEY", None)
    
    DEMO_MODE: bool = True
    SYNTHETIC_DATA_LABEL: str = "[SYNTHETIC DEMO DATA — Northstar Labs]"

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
