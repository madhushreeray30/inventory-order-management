# Settings come from environment variables (see .env.example) - nothing hardcoded.
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Full SQLAlchemy connection string, e.g.
    #   postgresql+psycopg://user:password@host:5432/dbname
    database_url: str = "postgresql+psycopg://postgres:postgres@db:5432/inventory"

    # Comma-separated list of origins allowed by CORS (the frontend URL).
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    app_name: str = "Inventory & Order Management API"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
