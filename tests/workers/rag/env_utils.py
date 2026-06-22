import os
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ENV_PATH = PROJECT_ROOT / "backend" / ".env"
RAG_SRC_PATH = PROJECT_ROOT / "workers" / "rag"


def load_backend_env() -> None:
    load_dotenv(dotenv_path=BACKEND_ENV_PATH, override=True)


def require_gemini_api_key() -> str:
    load_backend_env()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(f"GEMINI_API_KEY is missing in {BACKEND_ENV_PATH}")
    return api_key


def neon_database_url() -> str:
    load_backend_env()
    candidates = [
        os.getenv("DATABASE_URL"),
        os.getenv("DATABASE_URL_POOLER"),
    ]
    database_url = None
    local_hosts = {"localhost", "127.0.0.1", "::1"}

    for candidate in candidates:
        if not candidate:
            continue
        parsed = urlparse(candidate.replace("postgresql+psycopg2://", "postgresql://"))
        if (parsed.hostname or "") not in local_hosts:
            database_url = candidate
            break

    if not any(candidates):
        raise RuntimeError(f"DATABASE_URL or DATABASE_URL_POOLER is missing in {BACKEND_ENV_PATH}")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL and DATABASE_URL_POOLER point to local hosts; Neon DB URL is required"
        )

    os.environ["DATABASE_URL"] = database_url
    return database_url


def database_url_to_kwargs(database_url: str) -> dict:
    parsed = urlparse(database_url.replace("postgresql+psycopg2://", "postgresql://"))
    if not parsed.hostname:
        raise RuntimeError("DATABASE_URL is not parseable")
    return {
        "dbname": (parsed.path or "/").lstrip("/").split("?")[0],
        "user": parsed.username or "",
        "password": parsed.password or "",
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "connect_timeout": 5,
    }


def assert_neon_connection() -> None:
    database_url = neon_database_url()
    conn = psycopg2.connect(**database_url_to_kwargs(database_url))
    conn.close()
