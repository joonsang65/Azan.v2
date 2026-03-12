# 파일 기능: 환경변수를 로드/검증하고 SQLAlchemy 엔진·세션·Base를 생성하며 DB 의존성(get_db)을 제공한다.
import os
import re
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from dotenv import find_dotenv, load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

API_DIR = Path(__file__).resolve().parents[1]
DATABASE_URL_EXAMPLES = (
    "postgresql+psycopg2://postgres:postgres@localhost:5432/azan",
    "postgresql+psycopg2://postgres:postgres@db:5432/azan",
    "postgresql+psycopg2://<user>:<password>@<project>.neon.tech/<db>?sslmode=require",
    "postgresql+psycopg2://<user>:<password>@<pooler-host>.neon.tech/<db>?sslmode=require",
)


def _load_env_file() -> None:
    # 입력: 없음
    # 출력: None (환경변수 로드)
    load_dotenv(API_DIR / ".env", override=False)
    cwd_env = find_dotenv(".env", usecwd=True)
    if cwd_env:
        load_dotenv(cwd_env, override=False)


def _raise_config_error(message: str) -> None:
    # 입력: message (오류 설명)
    # 출력: None (RuntimeError 발생)
    examples_text = "\n".join(f"  - {example}" for example in DATABASE_URL_EXAMPLES)
    raise RuntimeError(
        f"{message}\n"
        "Set env vars in backend/.env (or export them):\n"
        "  - DATABASE_URL\n"
        "Valid DATABASE_URL examples:\n"
        f"{examples_text}"
    )


def _validate_database_url(value: str) -> None:
    # 입력: value (DATABASE_URL 문자열)
    # 출력: None (유효성 검사, 필요 시 예외)
    if re.search(r"<[^>]+>", value):
        _raise_config_error(
            "DATABASE_URL contains placeholder text like <PORT>. "
            "Replace placeholders with real values."
        )


def _read_bool(name: str, default: bool = False) -> bool:
    # 입력: name (환경변수명), default (기본값)
    # 출력: bool (환경변수 해석 결과)
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _base_database_url() -> str:
    # 입력: 없음
    # 출력: str (DATABASE_URL 또는 DATABASE_URL_POOLER)
    # Render deployments may expose a dedicated pooler URL.
    pooled_url = os.getenv("DATABASE_URL_POOLER")
    if pooled_url:
        return pooled_url
    fallback = os.getenv("DATABASE_URL")
    if fallback:
        return fallback
    _raise_config_error("DATABASE_URL (or DATABASE_URL_POOLER) is missing.")
    return ""


def _is_neon_host(url: str) -> bool:
    # 입력: url (DB 연결 문자열)
    # 출력: bool (Neon 호스트 여부)
    host = (urlparse(url).hostname or "").lower()
    return ".neon.tech" in host


def _ensure_sslmode_require(url: str) -> str:
    # 입력: url (DB 연결 문자열)
    # 출력: str (sslmode=require 보장된 URL)
    parsed = urlparse(url)
    query_items = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if "sslmode" not in query_items:
        query_items["sslmode"] = "require"
        return urlunparse(parsed._replace(query=urlencode(query_items)))
    return url


_load_env_file()
DATABASE_URL = _base_database_url()
_validate_database_url(DATABASE_URL)
if _is_neon_host(DATABASE_URL) or _read_bool("DB_REQUIRE_SSL", default=False):
    # Keep SSL policy in the URL itself so every PostgreSQL client path (engine/session/tests)
    # uses the same setting and we avoid driver-specific connect_args branching.
    DATABASE_URL = _ensure_sslmode_require(DATABASE_URL)

try:
    pool_size = int(os.getenv("DB_POOL_SIZE", "4"))
    max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "2"))
    pool_recycle = int(os.getenv("DB_POOL_RECYCLE", "1800"))
    pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    engine = create_engine(
        DATABASE_URL,
        future=True,
        pool_pre_ping=True,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_recycle=pool_recycle,
        pool_timeout=pool_timeout,
        pool_use_lifo=True,
    )
except ValueError as exc:
    _raise_config_error(
        f"DATABASE_URL format is invalid: {exc}. "
        "If you see '<PORT>' then placeholders were not replaced."
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def get_db() -> Session:
    # 입력: 없음
    # 출력: Session (yield로 제공되는 DB 세션)
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
