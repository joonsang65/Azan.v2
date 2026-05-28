# 파일 기능: 환경변수를 로드/검증하고 SQLAlchemy 엔진·세션·Base를 생성하며 DB 의존성(get_db)을 제공한다.
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .core.config import settings

DATABASE_URL = settings.effective_database_url

try:
    engine = create_engine(
        DATABASE_URL,
        future=True,
        pool_pre_ping=True,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_use_lifo=True,
    )
except ValueError as exc:
    # This might still happen if the URL format is somehow broken despite Pydantic validation
    raise RuntimeError(f"DATABASE_URL format is invalid: {exc}")

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

