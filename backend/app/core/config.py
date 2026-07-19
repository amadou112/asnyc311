"""Application configuration, driven entirely by environment variables.

Defaults point at the existing 311 pipeline's Postgres (exposed on localhost:5434)
so the backend runs locally with zero setup. Inside Docker Compose these are
overridden to reach the shared `postgres` service on the pipeline network.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    APP_NAME: str = "NYC 311 AI Management Platform"
    API_V1_PREFIX: str = "/api/v1"
    ENV: str = "local"
    DB_SCHEMA: str = "platform"

    # --- Database ---
    # Full SQLAlchemy URL takes precedence; otherwise assembled from parts.
    DATABASE_URL: str | None = None
    POSTGRES_USER: str = "pipeline"
    POSTGRES_PASSWORD: str = "pipeline"
    POSTGRES_DB: str = "nyc311"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5434  # host port of the pipeline's Postgres container

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # --- AI layer ---
    AI_PROVIDER: str = "mock"          # mock | openai | claude
    AI_MODEL: str = "mock-1"           # e.g. gpt-4o-mini / claude-sonnet-4 when live
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None

    # --- Security (models/hooks present; enforcement is a later phase) ---
    JWT_SECRET: str = "change-me-in-prod"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_TTL_MIN: int = 60

    @property
    def sqlalchemy_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
