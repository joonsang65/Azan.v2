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
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from .database import Base


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

    id: Mapped[Uuid] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    notice_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    keyword_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("keywords.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    preview: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    eng_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_processed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    image_urls: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, server_default="{}")
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

    user_id: Mapped[Uuid] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), primary_key=True)
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
        # Partial unique index: enforce uniqueness only for notice-based alerts (notice_id IS NOT NULL).
        # Risk alerts have notice_id = NULL so they are not subject to this constraint.
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


class InformationMenuPart(Base):
    __tablename__ = "information_menu_parts"
    __table_args__ = (
        UniqueConstraint(
            "menu_key",
            "part_key",
            "section_title",
            name="uq_information_menu_parts_menu_part_section",
        ),
        Index("ix_information_menu_parts_menu_part", "menu_key", "part_key"),
        Index(
            "ix_information_menu_parts_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[Uuid] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    menu_key: Mapped[str] = mapped_column(String, nullable=False)
    menu_title: Mapped[str] = mapped_column(String, nullable=False)
    part_key: Mapped[str] = mapped_column(String, nullable=False)
    part_title: Mapped[str] = mapped_column(String, nullable=False)
    section_title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    embedding: Mapped[list] = mapped_column(Vector(1536), nullable=False)
    embedding_model: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


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
