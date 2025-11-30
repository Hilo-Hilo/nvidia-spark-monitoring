"""Configuration settings for the application."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "change-me-in-production-generate-a-strong-random-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    
    # Database Settings
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/monitoring"
    
    # CORS Settings
    CORS_ORIGINS: list[str] = ["*"]  # Configure for Tailscale network
    
    # Data Collection Settings
    METRICS_COLLECTION_INTERVAL: int = 2  # seconds
    HISTORICAL_DATA_RETENTION_DAYS: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

