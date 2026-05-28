from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    DateTime,
    Index,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from ..database import Base

class InformationMenuPart(Base):
    __tablename__ = "information_menu_parts"
    __table_args__ = (
        UniqueConstraint(
            "menu_key",
            "part_key",
            name="uq_information_menu_parts_menu_part",
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
