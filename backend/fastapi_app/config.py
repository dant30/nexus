"""
FastAPI configuration settings.
Loads from environment variables.
"""
from typing import List, Optional
from enum import Enum
from shared.settings.env import env


class Environment(str, Enum):
    """Environment enum."""
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TESTING = "testing"


class Settings:
    """FastAPI Settings."""
    
    # Environment
    ENVIRONMENT: Environment = Environment(env.get("ENVIRONMENT", "development"))
    DEBUG: bool = env.get_bool("DEBUG", False)
    
    # FastAPI
    API_TITLE: str = "Nexus Trading Bot"
    API_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    
    # Server
    HOST: str = env.get("HOST", "0.0.0.0")
    PORT: int = env.get_int("PORT", 8000)
    
    # Security
    SECRET_KEY: str = env.get("SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: int = 3600  # 1 hour
    JWT_REFRESH_EXPIRATION: int = 604800  # 7 days
    
    # CORS
    CORS_ALLOWED_ORIGINS: List[str] = env.get_list(
        "CORS_ALLOWED_ORIGINS",
        [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ],
    )
    
    # Database (Django ORM)
    DATABASE_URL: str = env.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/nexus_db"
    )
    
    # Redis
    REDIS_URL: str = env.get("REDIS_URL", "redis://localhost:6379/0")
    REDIS_CACHE_TTL: int = 3600  # 1 hour
    
    # Deriv API
    DERIV_APP_ID: str = env.get("DERIV_APP_ID", "")
    DERIV_API_KEY: str = env.get("DERIV_API_KEY", "")
    DERIV_OAUTH_CALLBACK_URL: str = env.get(
        "DERIV_OAUTH_CALLBACK_URL",
        "http://localhost:3000/oauth/callback"
    )
    DERIV_SYMBOLS: List[str] = env.get_list(
        "DERIV_SYMBOLS",
        [
            "R_10",
            "R_25",
            "R_50",
            "R_75",
            "R_100",
        ],
    )
    
    # Trading Configuration
    MIN_STAKE: float = env.get_float("MIN_STAKE", 0.35)
    MAX_STAKE: float = env.get_float("MAX_STAKE", 1000.00)
    DEFAULT_STAKE: float = env.get_float("DEFAULT_STAKE", 1.00)
    
    # Risk Management
    MAX_DAILY_LOSS: float = env.get_float("MAX_DAILY_LOSS", 100.00)
    FIBONACCI_SEQUENCE: List[float] = [1.0, 1.5, 2.25, 3.375, 5.0, 7.5, 10.0]
    
    # Signal Configuration
    MIN_SIGNAL_CONFIDENCE: float = 0.70
    MIN_CONSENSUS_SIGNALS: int = 2
    
    # Logging
    LOG_LEVEL: str = env.get("LOG_LEVEL", "INFO")
    LOG_FILE: str = "logs/fastapi.log"
    
    # Celery (for async tasks)
    CELERY_BROKER_URL: str = env.get("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = env.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production."""
        return cls.ENVIRONMENT == Environment.PRODUCTION
    
    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development."""
        return cls.ENVIRONMENT == Environment.DEVELOPMENT


# Export singleton
settings = Settings()
