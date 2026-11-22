from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Values come from environment variables first, then backend/.env."""

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 30

    # Frontend origins allowed to call the API from the browser. In .env, a JSON list:
    # CORS_ORIGINS=["https://braindesk.example.com"]. Never "*" for an authenticated API.
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    upload_dir: Path = BACKEND_DIR / "uploads"
    max_upload_bytes: int = 25 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
