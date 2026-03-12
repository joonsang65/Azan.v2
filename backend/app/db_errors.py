# 파일 기능: DB 예외 메시지를 마스킹/로깅하고 공통 오류 응답을 만드는 유틸리티를 제공한다.
import logging
import re

from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger("azan.db")

_URI_CREDENTIALS_RE = re.compile(r"://([^:/\s]+):([^@/\s]+)@")
_PASSWORD_KV_RE = re.compile(r"(?i)(password=)([^&\s]+)")
_TOKEN_KV_RE = re.compile(r"(?i)(token=)([^&\s]+)")


def sanitize_db_error(exc: Exception) -> str:
    # 입력: exc (예외 객체)
    # 출력: str (민감정보가 마스킹된 메시지)
    raw = str(getattr(exc, "orig", exc) or exc.__class__.__name__)
    message = " ".join(raw.split())
    if not message:
        message = exc.__class__.__name__
    message = _URI_CREDENTIALS_RE.sub(r"://***:***@", message)
    message = _PASSWORD_KV_RE.sub(r"\1***", message)
    message = _TOKEN_KV_RE.sub(r"\1***", message)
    return message[:240]


def log_db_exception(context: str, exc: SQLAlchemyError) -> str:
    # 입력: context (로그 컨텍스트), exc (DB 예외)
    # 출력: str (마스킹된 메시지)
    sanitized = sanitize_db_error(exc)
    logger.error("%s (%s): %s", context, exc.__class__.__name__, sanitized)
    return sanitized


def db_connection_failed_response(exc: SQLAlchemyError) -> JSONResponse:
    # 입력: exc (DB 예외)
    # 출력: JSONResponse (표준 DB 오류 응답)
    sanitized = log_db_exception("Database operation failed", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": "DB connection failed",
            "code": "DB_CONNECT",
            "message": sanitized,
        },
    )
