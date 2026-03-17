# RAG 설정: 백엔드와 동일한 DB를 쓰기 위해 backend/.env의 DATABASE_URL을 사용한다.

import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

# apps/rag/src/rag/RAG_config.py -> parents[4] = 프로젝트 루트
_current_file = Path(__file__).resolve()
_project_root = _current_file.parents[4]
_backend_env = _project_root / "backend" / ".env"

if _backend_env.exists():
    load_dotenv(dotenv_path=_backend_env, override=False)
else:
    load_dotenv(override=False)


def _parse_database_url() -> dict:
    """DATABASE_URL을 psycopg2.connect(**kwargs) 형식으로 변환."""
    url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URL_POOLER") or ""
    url = url.replace("postgresql+psycopg2://", "postgresql://")
    if not url:
        return {}
    parsed = urlparse(url)
    if "@" in parsed.netloc:
        auth, hostport = parsed.netloc.rsplit("@", 1)
        user, _, password = auth.partition(":")  # password에 : 포함 가능
        host, _, port = hostport.partition(":")
        port = int(port) if port else 5432
    else:
        user = password = host = None
        port = 5432
    dbname = (parsed.path or "/").lstrip("/").split("?")[0]
    if not dbname:
        return {}
    return {
        "dbname": dbname,
        "user": user or "",
        "password": password or "",
        "host": host or "localhost",
        "port": port,
    }


class Config:
    PROJECT_NAME = "Azan Chatbot"

    # Gemini (backend/.env에 GEMINI_API_KEY 추가)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GENERATION_MODEL = os.getenv("GENERATION_MODEL", "gemini-2.5-flash")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")
    TEMPERATURE = 0.3
    RETRIEVER_TOP_K = 3

    # DB: 백엔드와 동일한 DATABASE_URL 사용
    @property
    def DB_PARAMS(self):
        params = _parse_database_url()
        if not params:
            return {
                "dbname": os.getenv("POSTGRES_DB", "azan"),
                "user": os.getenv("POSTGRES_USER", "postgres"),
                "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
                "host": os.getenv("POSTGRES_HOST", "localhost"),
                "port": int(os.getenv("POSTGRES_PORT", "5432")),
            }
        return params

    def validate(self):
        if not self.GEMINI_API_KEY:
            raise ValueError("[ERROR] GEMINI_API_KEY가 없습니다. backend/.env에 설정하세요.")


settings = Config()
settings.validate()
