

"""add_eng_body_to_notices

Revision ID: da16e1ed9856
Revises: 77f39e73372b
Create Date: 2026-04-29 13:33:47.329264

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector


# revision identifiers, used by Alembic.
revision: str = 'da16e1ed9856'
down_revision: Union[str, None] = '77f39e73372b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notices", sa.Column("eng_body", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("notices", "eng_body")
