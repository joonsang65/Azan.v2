# 파일 기능: 카테고리/공지 조회 및 공지 생성, 키워드 매칭과 알림 큐 적재를 처리한다.
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID as UUIDType
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AlertOutbox, Keyword, Notice, UserKeyword
from ..services.alert_service import queue_alerts_for_notice

router = APIRouter(tags=["notices"])


class NoticeCreateRequest(BaseModel):
    # 공지 생성 요청 바디 모델
    notice_id: Optional[str] = None
    keyword_id: Optional[int] = None
    title: str
    body: str
    eng_body: Optional[str] = None
    preview: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None
    image_urls: Optional[list[str]] = None
    hash: Optional[str] = None
    is_processed: bool = False
    deadline: Optional[date] = None
    published_at: Optional[datetime] = None


def _preview_from_body(body: str) -> str:
    # 입력: body (본문 문자열)
    # 출력: str (미리보기 텍스트)
    compact = " ".join((body or "").replace("\n", " ").split())
    return compact[:140]


@router.get("/notices")
# 입력: keyword_id/q/limit/offset, DB 세션
# 출력: dict (공지 목록 + 페이지 정보)
def list_notices(
    keyword_id: Optional[int] = Query(default=None),
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Notice)
        .outerjoin(Keyword, Keyword.id == Notice.keyword_id)
        .filter(Notice.notice_id.isnot(None))
    )

    if keyword_id is not None:
        query = query.filter(Notice.keyword_id == keyword_id)

    keyword = (q or "").strip()
    if keyword:
        like_pattern = f"%{keyword}%"
        query = query.filter(
            or_(
                Notice.title.ilike(like_pattern),
                Notice.preview.ilike(like_pattern),
                Notice.body.ilike(like_pattern),
            )
        )

    total = query.with_entities(func.count(Notice.id)).scalar() or 0
    item_rows = (
        query.with_entities(
            Notice.id,
            Notice.title,
            Notice.preview,
            Notice.body,
            Notice.url,
            Notice.deadline,
            Notice.image_urls,
            Notice.published_at,
            Keyword.id,
            Keyword.keyword,
        )
        .order_by(Notice.published_at.desc(), Notice.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "id": str(item_id),
                "keyword_id": keyword_id,
                "keyword": keyword,
                "title": title,
                "preview": preview,
                "body": body,
                "url": url,
                "deadline": deadline,
                "image_urls": image_urls or [],
                "published_at": published_at,
            }
            for (
                item_id,
                title,
                preview,
                body,
                url,
                deadline,
                image_urls,
                published_at,
                keyword_id,
                keyword,
            ) in item_rows
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/notices", status_code=201)
# 입력: NoticeCreateRequest, DB 세션
# 출력: dict (생성된 공지 요약 + 큐 적재 수)
def create_notice(body: NoticeCreateRequest, db: Session = Depends(get_db)):
    try:
        if body.keyword_id is None:
            raise HTTPException(status_code=422, detail="keyword_id is required")
        keyword_row = db.get(Keyword, body.keyword_id)
        if keyword_row is None:
            raise HTTPException(status_code=422, detail="keyword_id not found")

        resolved_notice_id = (body.notice_id or f"manual-{uuid4()}").strip()
        existing = db.query(Notice).filter(Notice.notice_id == resolved_notice_id).one_or_none()
        if existing is not None:
            raise HTTPException(status_code=409, detail="notice_id already exists")

        resolved_published_at = body.published_at or datetime.now(timezone.utc)
        preview = (body.preview or "").strip() or _preview_from_body(body.body)

        notice = Notice(
            notice_id=resolved_notice_id,
            keyword_id=int(keyword_row.id),
            title=body.title.strip(),
            preview=preview,
            body=body.body,
            eng_body=body.eng_body,
            source=body.source,
            url=body.url,
            hash=body.hash,
            is_processed=body.is_processed,
            deadline=body.deadline,
            image_urls=body.image_urls or [],
            published_at=resolved_published_at,
        )
        db.add(notice)
        db.flush()

        queued_count = queue_alerts_for_notice(db, notice.id)
        db.commit()

        return {
            "id": str(notice.id),
            "notice_id": notice.notice_id,
            "title": notice.title,
            "keyword_id": notice.keyword_id,
            "keyword": keyword_row.keyword,
            "queued_alerts": queued_count,
        }
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Notice create conflict")


@router.get("/notices/{notice_id}")
# 입력: notice_id, DB 세션
# 출력: dict (공지 상세)
def get_notice(notice_id: UUIDType, db: Session = Depends(get_db)):
    notice_row = (
        db.query(Notice, Keyword)
        .outerjoin(Keyword, Keyword.id == Notice.keyword_id)
        .filter(Notice.id == notice_id)
        .one_or_none()
    )

    if notice_row is None:
        raise HTTPException(status_code=404, detail="Notice not found")

    notice, keyword_row = notice_row
    return {
        "id": str(notice.id),
        "title": notice.title,
        "body": notice.body,
        "eng_body": notice.eng_body,
        "preview": notice.preview,
        "url": notice.url,
        "deadline": notice.deadline,
        "image_urls": notice.image_urls or [],
        "keyword_id": notice.keyword_id,
        "keyword": keyword_row.keyword if keyword_row else None,
        "published_at": notice.published_at,
    }
