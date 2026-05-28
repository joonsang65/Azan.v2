from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Load from .env file if it exists
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Database Settings
    DATABASE_URL: str
    DATABASE_URL_POOLER: Optional[str] = None
    DB_REQUIRE_SSL: bool = False
    DB_POOL_SIZE: int = 4
    DB_MAX_OVERFLOW: int = 2
    DB_POOL_RECYCLE: int = 1800
    DB_POOL_TIMEOUT: int = 30

    # JWT Settings
    JWT_SECRET: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    # App Settings
    PORT: int = 8000

    @property
    def effective_database_url(self) -> str:
        """
        Returns the database URL to use, prioritizing the pooler URL if available.
        Ensures sslmode=require if it's a Neon host or DB_REQUIRE_SSL is true.
        """
        url = self.DATABASE_URL_POOLER or self.DATABASE_URL
        
        # Check if it's a Neon host
        host = (urlparse(url).hostname or "").lower()
        is_neon = ".neon.tech" in host

        if is_neon or self.DB_REQUIRE_SSL:
            parsed = urlparse(url)
            query_items = dict(parse_qsl(parsed.query, keep_blank_values=True))
            if "sslmode" not in query_items:
                query_items["sslmode"] = "require"
                url = urlunparse(parsed._replace(query=urlencode(query_items)))
        
        return url

settings = Settings()
