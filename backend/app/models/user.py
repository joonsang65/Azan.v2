from datetime import date, datetime
from typing import Optional, TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Uuid,
    func,
    BigInteger,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base

if TYPE_CHECKING:
    from .keyword import UserKeyword

class User(Base):
    # 사용자 계정 테이블 모델
    __tablename__ = "users"

    id: Mapped[Uuid] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    expo_push_token: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # 상세 프로필 정보
    language_institute_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    language_institute_term: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    target_admission_term: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    desired_major: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    visa_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    visa_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    visa_expiry_unknown: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    topik_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    topik_level: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    topik_target_level: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    topik_test_plan: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    preferred_language: Mapped[str] = mapped_column(String, default="English", server_default="English")
    residence_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    visa_risk: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    topik_risk: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    visa_last_notified_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    topik_last_notified_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    keyword_subscriptions: Mapped[list["UserKeyword"]] = relationship(
        "UserKeyword", back_populates="user", cascade="all, delete-orphan"
    )


class UserNoticeRead(Base):
    # 사용자의 공지사항 조회/클릭 이력 테이블 모델
    __tablename__ = "user_notice_reads"
    __table_args__ = (
        Index("ix_user_notice_reads_user_notice", "user_id", "notice_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Uuid] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notice_id: Mapped[Uuid] = mapped_column(Uuid(as_uuid=True), ForeignKey("notices.id"), nullable=False)
    read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
