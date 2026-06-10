"""add title_eng to notices

Revision ID: a2b3c4d5e6f7
Revises: 96f5d4e5304f
Create Date: 2026-06-10 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, None] = "96f5d4e5304f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notices", sa.Column("title_eng", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("notices", "title_eng")
