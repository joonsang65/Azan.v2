from datetime import date, datetime
from typing import Optional, TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from ..database import Base

if TYPE_CHECKING:
    from .keyword import Keyword

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
    title_eng: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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
    # RAG용: Gemini embedding 1536차원
    embedding: Mapped[Optional[list]] = mapped_column(Vector(1536), nullable=True)
    keyword: Mapped["Keyword"] = relationship("Keyword", back_populates="notices")
