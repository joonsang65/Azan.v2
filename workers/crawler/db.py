"""
db.py — Ajou 공지 크롤러의 데이터베이스 상호작용 계층.

세 가지 함수를 제공:
  get_session()      — SQLAlchemy SessionLocal 을 사용하여 세션을 생성해 반환
  notice_exists()    — notices 테이블에 해당 notice_id 행이 이미 존재하면 True 반환
  upsert_notice()    — 공지 행 한 건을 삽입; "inserted" 또는 "skipped" 반환

크롤 시점에 채워지는 컬럼:
  id, notice_id, title, body, source, hash,
  is_processed (false), url, published_at, created_at (NOW()),
  image_urls (text[] — R2에 업로드된 이미지 공개 URL 배열, 없으면 빈 배열)

하위 파이프라인을 위해 NULL로 남겨두는 컬럼:
  deadline, keyword_id, embedding, eng_body
"""

from __future__ import annotations
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.models import Notice


def get_session() -> Session:
    """
    SQLAlchemy SessionLocal 을 사용하여 새로운 DB 세션을 반환한다.
    """
    return SessionLocal()


def delete_old_notices_by_deadline(session: Session, days_offset: int = 7) -> int:
    """
    마감일(deadline)이 현재 날짜 기준 일정 기간(기본 7일) 이상 지난 공지를 삭제한다.

    Input:
        session     — SQLAlchemy Session
        days_offset — 며칠 전 마감된 공지까지 남겨둘지 결정 (기본 7일)

    Output: 삭제된 행의 개수
    """
    cutoff_date = date.today() - timedelta(days=days_offset)
    stmt = delete(Notice).where(Notice.deadline < cutoff_date)
    
    try:
        result = session.execute(stmt)
        session.commit()
        return result.rowcount
    except Exception:
        session.rollback()
        raise


def notice_exists(session: Session, notice_id: str) -> bool:
    """
    주어진 notice_id 를 가진 행이 notices 테이블에 이미 존재하는지 확인한다.

    Input:
        session    — SQLAlchemy Session
        notice_id  — 아주대 공지사항 게시판의 articleNo 문자열

    Output: 행이 존재하면 True, 그렇지 않으면 False
    """
    stmt = select(Notice).where(Notice.notice_id == notice_id).limit(1)
    return session.execute(stmt).first() is not None


def upsert_notice(session: Session, notice_data: dict) -> str:
    """
    PostgreSQL 전용 ON CONFLICT (notice_id) DO NOTHING 구문으로 공지 행 한 건을 삽입한다.

    Input:
        session     — SQLAlchemy Session
        notice_data — 공지 데이터가 담긴 dict

    Output: 새 행이 작성되면 "inserted", 중복으로 skip되면 "skipped"
    """
    # notice_data 에 UUID 는 생략해도 Notice 모델의 default=uuid4 가 작동하지만,
    # raw insert statement 에서는 직접 넘겨주는 것이 명확함.
    # 하지만 여기서는 model 이 아닌 insert statement 를 사용하므로 명시적으로 처리.
    
    stmt = insert(Notice).values(
        notice_id=notice_data["notice_id"],
        title=notice_data["title"],
        body=notice_data["body"],
        source=notice_data["source"],
        hash=notice_data["hash"],
        url=notice_data["url"],
        published_at=notice_data["published_at"],
        image_urls=notice_data["image_urls"],
        is_processed=False
    ).on_conflict_do_nothing(index_elements=["notice_id"])

    try:
        result = session.execute(stmt)
        session.commit()
        return "inserted" if result.rowcount == 1 else "skipped"
    except Exception:
        session.rollback()
        raise
