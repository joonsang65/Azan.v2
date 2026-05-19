"""merge notice and profile migration heads

Revision ID: c0043515merge
Revises: 3b1e8f4d2a9c, da16e1ed9856
Create Date: 2026-05-19 00:00:00.000000

"""
from typing import Sequence, Union


revision: str = "c0043515merge"
down_revision: Union[str, tuple[str, str], None] = (
    "3b1e8f4d2a9c",
    "da16e1ed9856",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
