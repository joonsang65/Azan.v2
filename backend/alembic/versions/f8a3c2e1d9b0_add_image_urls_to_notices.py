"""add image_urls to notices

Revision ID: f8a3c2e1d9b0
Revises: d7e3f1a0b4c5
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "f8a3c2e1d9b0"
down_revision: Union[str, None] = "d7e3f1a0b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE public.notices "
        "ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.notices DROP COLUMN IF EXISTS image_urls")
