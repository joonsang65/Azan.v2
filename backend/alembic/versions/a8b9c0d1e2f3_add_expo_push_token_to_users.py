"""add expo_push_token to users

Revision ID: a8b9c0d1e2f3
Revises: cf02b2a86bf8
Create Date: 2026-03-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a8b9c0d1e2f3'
down_revision: Union[str, None] = 'cf02b2a86bf8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('expo_push_token', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'expo_push_token')
