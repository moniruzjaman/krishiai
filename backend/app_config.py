
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Environment variables are prioritized
    api_key: str = os.getenv("API_KEY", "")
    supabase_url: str = os.getenv("SUPABASE_URL", "https://nmngzjrrysjzuxfcklrk.supabase.co")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    hf_token: str = os.getenv("HF_TOKEN", "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")

settings = Settings()
