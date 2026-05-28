from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base

if TYPE_CHECKING:
    from .user import User
    from .notice import Notice

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
    user: Mapped["User"] = relationship("User", back_populates="keyword_subscriptions")
    keyword: Mapped[Keyword] = relationship("Keyword", back_populates="user_links")
