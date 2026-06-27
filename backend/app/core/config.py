from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="VLSI Forge API", alias="APP_NAME")
    env: str = Field(default="development", alias="ENV")
    database_url: str = Field(
        default="sqlite+pysqlite:///./vlsiapp.db",
        alias="DATABASE_URL",
    )
    jwt_secret: str = Field(default="dev-only-secret", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=1440, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    cors_origins: str = Field(default="http://localhost:8081", alias="CORS_ORIGINS")


@lru_cache
def get_settings() -> Settings:
    return Settings()
