# 파일 기능: 단일 키워드 정책에 맞춰 notice_keywords 조인 테이블을 제거한다.
"""drop notice_keywords table

Revision ID: 6f4a2d1c9e11
Revises: c3f2a6d8b1c0
Create Date: 2026-03-12 21:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6f4a2d1c9e11"
down_revision: Union[str, None] = "c3f2a6d8b1c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_notice_keywords_keyword_id")
    op.execute("DROP TABLE IF EXISTS notice_keywords")


def downgrade() -> None:
    op.create_table(
        "notice_keywords",
        sa.Column("notice_id", sa.UUID(), nullable=False),
        sa.Column("keyword_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(["keyword_id"], ["keywords.id"]),
        sa.ForeignKeyConstraint(["notice_id"], ["notices.id"]),
        sa.PrimaryKeyConstraint("notice_id", "keyword_id"),
    )
    op.create_index("ix_notice_keywords_keyword_id", "notice_keywords", ["keyword_id"], unique=False)
