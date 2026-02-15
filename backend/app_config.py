"""
Configuration settings for Krishi AI Backend
"""

import os

from pydantic import BaseSettings, Field
from pydantic_settings import BaseSettings as PydanticSettings


class Settings(PydanticSettings):
    # Supabase Settings (for crop diagnosis data)
    supabase_url: str = Field(
        default=os.getenv("SUPABASE_URL", "https://nmngzjrrysjzuxfcklrk.supabase.co")
    )
    supabase_key: str = Field(default=os.getenv("SUPABASE_KEY"))

    # Firebase Settings (for users, chat, and alerts)
    firebase_api_key: str = Field(default=os.getenv("FIREBASE_API_KEY"))
    firebase_project_id: str = Field(default=os.getenv("FIREBASE_PROJECT_ID"))
    firebase_credentials_path: str = Field(
        default=os.getenv("FIREBASE_CREDENTIALS_PATH")
    )

    # Gemini AI Settings
    gemini_api_key: str = Field(default=os.getenv("GEMINI_API_KEY"))

    # Application Settings
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=True)
    log_level: str = Field(default="INFO")

    # CORS Settings
    cors_origins: list = Field(
        default=["http://localhost:3000", "http://localhost:5173"]
    )

    # Legacy settings for backward compatibility
    api_key: str = Field(default=os.getenv("API_KEY", ""))
    hf_token: str = Field(
        default=os.getenv("HF_TOKEN", "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")
    )

    class Config:
        env_file = ".env"


# Create a global settings instance
settings = Settings()
