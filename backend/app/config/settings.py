from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Wind Turbine AI Backend"
    APP_ENV: str = "development"
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # MongoDB Configuration (Local first, Atlas ready)
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "wind_turbine_ai"

    # JWT Authentication
    JWT_SECRET_KEY: str = "CHANGE_THIS_SECRET_KEY_FOR_PRODUCTION_USE_AT_LEAST_32_BYTES"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # CORS Origins
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # External Weather API
    WEATHER_API_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"

    # Storage paths relative to backend root
    UPLOAD_DIR: str = "storage/uploads"
    PROCESSED_DIR: str = "storage/processed"
    ANALYSIS_RESULTS_DIR: str = "storage/analysis_results"

    # Model root path relative to project root
    MODEL_ROOT: str = "../trained_models"

    # File upload limit (in bytes) - default 100MB
    MAX_UPLOAD_SIZE_BYTES: int = 100 * 1024 * 1024

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
