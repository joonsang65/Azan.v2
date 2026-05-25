"""add risk notification schema

Adds visa_risk, topik_risk, visa_last_notified_at, topik_last_notified_at columns
to the users table, and prepares alert_outbox to support risk alerts:
  - notice_id becomes nullable (risk alerts have no associated notice)
  - drops the (user_id, notice_id) unique constraint
  - adds a partial unique index that enforces uniqueness only when notice_id IS NOT NULL
  - adds a JSONB payload column for risk alert metadata

Revision ID: a1b2c3d4e5f6
Revises: c0043515merge
Create Date: 2026-05-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "c0043515merge"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users: add risk tracking columns ---
    op.add_column("users", sa.Column("visa_risk", sa.SmallInteger(), nullable=True))
    op.add_column("users", sa.Column("topik_risk", sa.SmallInteger(), nullable=True))
    op.add_column("users", sa.Column("visa_last_notified_at", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("topik_last_notified_at", sa.Date(), nullable=True))

    # --- alert_outbox: support risk alerts (no notice_id) ---

    # 1. Make notice_id nullable so risk alerts can omit it
    op.alter_column(
        "alert_outbox",
        "notice_id",
        existing_type=sa.UUID(),
        nullable=True,
    )

    # 2. Drop the old unique constraint (it breaks when notice_id is NULL)
    op.drop_constraint("uq_alert_outbox_user_notice", "alert_outbox", type_="unique")

    # 3. Replace with a partial unique index covering only notice-based rows
    op.create_index(
        "ix_alert_outbox_user_notice",
        "alert_outbox",
        ["user_id", "notice_id"],
        unique=True,
        postgresql_where=text("notice_id IS NOT NULL"),
    )

    # 4. Add JSONB payload column for risk alert metadata
    op.add_column("alert_outbox", sa.Column("payload", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("alert_outbox", "payload")

    op.drop_index("ix_alert_outbox_user_notice", table_name="alert_outbox")

    op.create_unique_constraint(
        "uq_alert_outbox_user_notice", "alert_outbox", ["user_id", "notice_id"]
    )

    # Rows with notice_id IS NULL must be removed before this can succeed
    op.execute("DELETE FROM alert_outbox WHERE notice_id IS NULL")
    op.alter_column(
        "alert_outbox",
        "notice_id",
        existing_type=sa.UUID(),
        nullable=False,
    )

    op.drop_column("users", "topik_last_notified_at")
    op.drop_column("users", "visa_last_notified_at")
    op.drop_column("users", "topik_risk")
    op.drop_column("users", "visa_risk")
