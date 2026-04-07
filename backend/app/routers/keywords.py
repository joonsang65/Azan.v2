# 파일 기능: 키워드 목록 조회와 사용자 키워드 구독/해제를 처리하는 API를 제공한다.
from typing import Optional
from uuid import UUID as UUIDType

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .auth import _parse_user_id
from ..database import get_db
from ..models import Keyword, User, UserKeyword

router = APIRouter(tags=["keywords"])


class UserKeywordUpsertRequest(BaseModel):
    # 사용자 키워드 구독 추가 요청 바디 모델
    keyword_ids: Optional[list[int]] = None


class UserMyKeywordsUpdateRequest(BaseModel):
    # 내 키워드 전체 갱신 요청 바디 모델
    enabled: list[int]


def _user_keywords_payload(user: User, db: Session):
    # 입력: user, db
    # 출력: list[dict] (사용자 구독 키워드 목록)
    keywords = (
        db.query(Keyword)
        .join(UserKeyword, UserKeyword.keyword_id == Keyword.id)
        .filter(UserKeyword.user_id == user.id)
        .order_by(Keyword.keyword.asc())
        .all()
    )
    return [{"id": keyword.id, "keyword": keyword.keyword} for keyword in keywords]


@router.get("/keywords")
# 입력: DB 세션
# 출력: list[dict] (전체 키워드 목록)
def list_keywords(db: Session = Depends(get_db)):
    keywords = db.query(Keyword).order_by(Keyword.keyword.asc()).all()
    return [
        {"id": keyword.id, "keyword": keyword.keyword}
        for keyword in keywords
    ]


@router.get("/users/me/keywords")
# 입력: 인증된 사용자 UUID, DB 세션
# 출력: dict (enabled 키워드 ID 리스트)
def get_my_keywords(user_uuid: UUIDType = Depends(_parse_user_id), db: Session = Depends(get_db)):
    enabled_rows = (
        db.query(Keyword.id)
        .join(UserKeyword, UserKeyword.keyword_id == Keyword.id)
        .filter(UserKeyword.user_id == user_uuid)
        .all()
    )

    return {"enabled": [int(keyword_id) for (keyword_id,) in enabled_rows]}


@router.put("/users/me/keywords")
# 입력: UserMyKeywordsUpdateRequest, 인증된 사용자 UUID, DB 세션
# 출력: dict (갱신된 enabled 키워드 ID 리스트)
def update_my_keywords(
    body: UserMyKeywordsUpdateRequest,
    user_uuid: UUIDType = Depends(_parse_user_id),
    db: Session = Depends(get_db),
):
    normalized_enabled = sorted({int(key) for key in (body.enabled or [])})

    try:
        user = db.get(User, user_uuid)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        keyword_rows = []
        if normalized_enabled:
            keyword_rows = db.query(Keyword).filter(Keyword.id.in_(normalized_enabled)).all()
            resolved_ids = {int(row.id) for row in keyword_rows}
            missing_ids = [str(key) for key in normalized_enabled if key not in resolved_ids]
            if missing_ids:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Unknown keyword ids: {', '.join(missing_ids)}",
                )

        db.query(UserKeyword).filter(UserKeyword.user_id == user_uuid).delete(synchronize_session=False)
        if keyword_rows:
            stmt = pg_insert(UserKeyword).values(
                [{"user_id": user_uuid, "keyword_id": int(keyword.id)} for keyword in keyword_rows]
            )
            stmt = stmt.on_conflict_do_nothing(index_elements=["user_id", "keyword_id"])
            db.execute(stmt)
        db.commit()
    except HTTPException:
        db.rollback()
        raise

    return {"enabled": normalized_enabled}


@router.get("/users/{user_id}/keywords")
# 입력: user_id, DB 세션
# 출력: list[dict] (사용자 구독 키워드 목록)
def get_user_keywords(user_id: UUIDType, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_keywords_payload(user, db)


@router.post("/users/{user_id}/keywords")
# 입력: user_id, UserKeywordUpsertRequest, DB 세션
# 출력: list[dict] (사용자 구독 키워드 목록)
def subscribe_user_keywords(user_id: UUIDType, body: UserKeywordUpsertRequest, db: Session = Depends(get_db)):
    try:
        user = db.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        requested_ids = {int(k) for k in (body.keyword_ids or [])}
        if not requested_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Provide at least one keyword_id.",
            )

        if requested_ids:
            stmt = pg_insert(UserKeyword).values(
                [{"user_id": user.id, "keyword_id": keyword_id} for keyword_id in sorted(requested_ids)]
            )
            stmt = stmt.on_conflict_do_nothing(index_elements=["user_id", "keyword_id"])
            db.execute(stmt)
        db.commit()
        return _user_keywords_payload(user, db)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Invalid keyword subscription request.") from exc


@router.delete("/users/{user_id}/keywords/{keyword_id}")
# 입력: user_id, keyword_id, DB 세션
# 출력: dict (처리 상태)
def unsubscribe_user_keyword(user_id: UUIDType, keyword_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    deleted = (
        db.query(UserKeyword)
        .filter(UserKeyword.user_id == user.id, UserKeyword.keyword_id == keyword_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "ok"}
