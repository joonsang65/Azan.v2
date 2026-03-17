# 파일 기능: notices 테이블에 RAG용 embedding 컬럼을 추가한다.
"""add notices embedding

Revision ID: a1b2c3d4e5f6
Revises: 6f4a2d1c9e11
Create Date: 2026-03-15

"""
from typing import Sequence, Union

from alembic import op


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "6f4a2d1c9e11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("ALTER TABLE notices ADD COLUMN IF NOT EXISTS embedding vector(3072) NULL")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_notices_embedding "
        "ON notices USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_notices_embedding")
    op.execute("ALTER TABLE notices DROP COLUMN IF EXISTS embedding")
