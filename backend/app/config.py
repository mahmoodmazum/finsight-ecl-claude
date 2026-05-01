from pydantic_settings import BaseSettings
from functools import lru_cache
from urllib.parse import quote_plus
from urllib.parse import quote_plus


class Settings(BaseSettings):
    # Database
    DB_SERVER: str = "localhost"
    DB_PORT: int = 1433
    DB_NAME: str = "finsight_ecl"
    DB_USER: str = "sa"
    DB_PASSWORD: str = "YourPassword123!"
    DB_DRIVER: str = "ODBC Driver 17 for SQL Server"

    # JWT
    JWT_SECRET_KEY: str = "change-this-to-a-secure-random-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # External systems
    T24_API_BASE_URL: str = "https://t24.ificbankbd.com/api"
    T24_API_KEY: str = ""
    COLLATERAL_DB_CONNECTION: str = ""
    RATING_API_BASE_URL: str = ""

    # Scheduler
    SCHEDULER_TIMEZONE: str = "Asia/Dhaka"
    ENABLE_SCHEDULER: bool = True

    @property
    def database_url(self) -> str:
        driver = self.DB_DRIVER.replace(" ", "+")
        password = quote_plus(self.DB_PASSWORD)
        return (
            f"mssql+aioodbc://{self.DB_USER}:{password}"
            f"@{self.DB_SERVER}:{self.DB_PORT}/{self.DB_NAME}"
            f"?driver={driver}&TrustServerCertificate=yes"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
