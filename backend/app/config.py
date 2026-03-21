from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://runcrew:runcrew_password@db:5432/runcrew"
    ADMIN_JWT_SECRET: str = "admin-dev-secret-change-me"
    ADMIN_JWT_ALGORITHM: str = "HS256"
    ADMIN_JWT_EXPIRE_HOURS: int = 24
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"


settings = Settings()
