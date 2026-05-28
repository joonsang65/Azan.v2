from uuid import UUID as UUIDType
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from ..models import AlertOutbox, Notice, UserKeyword

def queue_alerts_for_notice(db: Session, notice_uuid: UUIDType) -> int:
    """
    공지사항의 키워드를 구독 중인 모든 사용자에게 알림 큐(alert_outbox) 삽입.
    
    입력: db, notice_uuid
    출력: int (큐에 적재된 알림 개수)
    """
    subscriber_rows = (
        db.query(UserKeyword.user_id)
        .join(Notice, Notice.keyword_id == UserKeyword.keyword_id)
        .filter(Notice.id == notice_uuid)
        .distinct()
        .all()
    )
    user_ids = [row[0] for row in subscriber_rows]
    if not user_ids:
        return 0

    stmt = pg_insert(AlertOutbox).values(
        [{"user_id": user_id, "notice_id": notice_uuid, "status": "pending", "try_count": 0} for user_id in user_ids]
    )
    stmt = stmt.on_conflict_do_nothing(index_elements=["user_id", "notice_id"])
    result = db.execute(stmt)
    return int(result.rowcount or 0)
