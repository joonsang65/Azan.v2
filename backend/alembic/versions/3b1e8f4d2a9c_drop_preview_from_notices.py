"""keep preview on notices

Revision ID: 3b1e8f4d2a9c
Revises: f8a3c2e1d9b0
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "3b1e8f4d2a9c"
down_revision: Union[str, None] = "f8a3c2e1d9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS preview text")
    op.execute(
        "UPDATE public.notices "
        "SET preview = LEFT(COALESCE(body, title, ''), 140) "
        "WHERE preview IS NULL OR preview = ''"
    )


def downgrade() -> None:
    pass
