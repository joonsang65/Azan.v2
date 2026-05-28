from datetime import datetime
from typing import Optional
from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

class AlertOutbox(Base):
    # 알림 발송 대기 큐 테이블 모델
    __tablename__ = "alert_outbox"
    __table_args__ = (
        Index(
            "ix_alert_outbox_user_notice",
            "user_id",
            "notice_id",
            unique=True,
            postgresql_where=text("notice_id IS NOT NULL"),
        ),
        Index("ix_alert_outbox_status_created_at", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Uuid] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notice_id: Mapped[Optional[Uuid]] = mapped_column(Uuid(as_uuid=True), ForeignKey("notices.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending", server_default="pending")
    try_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class RiskMsg(Base):
    # 리스크 알림 메세지 템플릿 테이블 모델 (alarm_type + risk_level + lang 별 메세지)
    __tablename__ = "risk_msg"
    __table_args__ = (
        UniqueConstraint("alarm_type", "risk_level", "lang", name="uq_risk_msg_type_level_lang"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    alarm_type: Mapped[str] = mapped_column(String(10), nullable=False)   # 'visa' | 'topik'
    risk_level: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # visa: 1~5, topik: 1~3
    lang: Mapped[str] = mapped_column(String(10), nullable=False)          # 'Korean' | 'English'
    message: Mapped[str] = mapped_column(Text, nullable=False)
