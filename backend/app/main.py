# 파일 기능: FastAPI 애플리케이션 엔트리포인트로 라우터 등록, 미들웨어, 헬스체크, 시작 시 DB 초기화를 담당한다.
import os
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .core.config import settings
from .core.logging import setup_logging
from .db_errors import db_connection_failed_response, log_db_exception, sanitize_db_error
from .database import SessionLocal
from .routers.auth import router as auth_router
from .routers.keywords import router as keywords_router
from .routers.notices import router as notices_router
from .routers.chatbot import router as chatbot_router, chatbot_service
from .routers.information_menu import router as information_menu_router

# Setup centralized logging
setup_logging()
logger = logging.getLogger("azan.main")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup: Initialize DB connection
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        logger.info("Database connection established during startup.")
    except SQLAlchemyError as exc:
        log_db_exception("Startup DB initialization failed", exc)
    except Exception as exc:
        logger.error("Startup initialization failed: %s", exc)
    finally:
        db.close()
    
    # Warm up chatbot service (Connection Pool & pgvector)
    try:
        await chatbot_service.warmup()
    except Exception as exc:
        logger.warning(f"Chatbot warm-up failed: {exc}")

    yield
    # Shutdown: Add cleanup logic if needed
    logger.info("Application shutting down.")

app = FastAPI(title="azan-api", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 로컬 개발 및 핫스팟 환경을 위해 일시적으로 전체 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SQLAlchemyError)
# 입력: Request, SQLAlchemyError
# 출력: JSONResponse (DB 오류 응답)
def sqlalchemy_error_handler(_request: Request, exc: SQLAlchemyError) -> JSONResponse:
    return db_connection_failed_response(exc)


@app.get("/health")
# 입력: 없음
# 출력: dict[str, str] (서비스 상태)
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db", response_model=None)
# 입력: 없음
# 출력: dict 또는 JSONResponse (DB 상태)
def health_db():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"db": "ok"}
    except SQLAlchemyError as exc:
        message = sanitize_db_error(exc)
        log_db_exception("DB health check failed", exc)
        return JSONResponse(status_code=500, content={"db": "error", "message": message})
    finally:
        db.close()

app.include_router(auth_router)
app.include_router(keywords_router)
app.include_router(notices_router)
app.include_router(chatbot_router)
app.include_router(information_menu_router)


if __name__ == "__main__":
    # 환경변수 PORT가 없으면 settings.PORT 사용, 모든 인터페이스(0.0.0.0)에서 대기
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
