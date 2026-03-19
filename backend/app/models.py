# 파일 기능: 사용자, 공지, 키워드, 구독 등 도메인 엔티티의 SQLAlchemy ORM 모델을 정의한다.
from datetime import date, datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from .database import Base


class User(Base):
    # 사용자 계정 테이블 모델
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    keyword_subscriptions: Mapped[list["UserKeyword"]] = relationship(
        "UserKeyword", back_populates="user", cascade="all, delete-orphan"
    )


class Notice(Base):
    # 공지 테이블 모델
    __tablename__ = "notices"
    __table_args__ = (
        Index("ix_notices_keyword_published", "keyword_id", "published_at"),
        Index("ix_notices_title_trgm", "title", postgresql_using="gin", postgresql_ops={"title": "gin_trgm_ops"}),
        Index(
            "ix_notices_preview_trgm",
            "preview",
            postgresql_using="gin",
            postgresql_ops={"preview": "gin_trgm_ops"},
        ),
    )

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    notice_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    keyword_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("keywords.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    preview: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_processed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # RAG용: Gemini embedding 1536차원 (nullable, 기존 행과 호환 - 임베딩 사이즈 조정 진행)
    embedding: Mapped[Optional[list]] = mapped_column(Vector(1536), nullable=True)
    keyword: Mapped["Keyword"] = relationship("Keyword", back_populates="notices")


class Keyword(Base):
    # 키워드 테이블 모델
    __tablename__ = "keywords"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    keyword: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    user_links: Mapped[list["UserKeyword"]] = relationship("UserKeyword", back_populates="keyword")
    notices: Mapped[list["Notice"]] = relationship("Notice", back_populates="keyword")


class UserKeyword(Base):
    # 사용자-키워드 구독 매핑 테이블 모델
    __tablename__ = "user_keywords"
    __table_args__ = (
        Index("ix_user_keywords_keyword_id", "keyword_id"),
        Index("ix_user_keywords_user_id", "user_id"),
    )

    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    keyword_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("keywords.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    user: Mapped[User] = relationship("User", back_populates="keyword_subscriptions")
    keyword: Mapped[Keyword] = relationship("Keyword", back_populates="user_links")


class AlertOutbox(Base):
    # 알림 발송 대기 큐 테이블 모델
    __tablename__ = "alert_outbox"
    __table_args__ = (
        UniqueConstraint("user_id", "notice_id", name="uq_alert_outbox_user_notice"),
        Index("ix_alert_outbox_status_created_at", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notice_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notices.id"), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending", server_default="pending")
    try_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
