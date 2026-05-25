"""add risk_msg table with seed data

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SEED_ROWS = [
    # VISA Korean
    ("visa", 1, "Korean", "비자 만료일까지 90일 이상 남았습니다. 갱신 준비는 D-40부터 시작됩니다."),
    ("visa", 2, "Korean", "비자 만료까지 {days_left}일 남았습니다. 조속히 국제대학원 교학팀(국제교류팀)에 문의하세요."),
    ("visa", 3, "Korean", "교학팀 서류 접수 마감일이 다가오고 있습니다. 지금 바로 서류를 제출해 주세요."),
    ("visa", 4, "Korean", "교학팀 서류 접수 마감이 지났습니다. 즉시 출입국관리사무소 방문 예약을 진행하세요."),
    ("visa", 5, "Korean", "[긴급] 지금 즉시 출입국관리사무소 또는 국제대학원 교학팀에 연락하시기 바랍니다."),
    # VISA English
    ("visa", 1, "English", "Your visa expiry is more than 90 days away. Renewal preparation begins at D-40."),
    ("visa", 2, "English", "Your visa expires in {days_left} days. Contact the International Student Support Office soon."),
    ("visa", 3, "English", "School office processing deadline is approaching. Submit your documents now."),
    ("visa", 4, "English", "School office deadline has passed. Book an appointment at the Immigration Office immediately."),
    ("visa", 5, "English", "URGENT: Contact the Immigration Office or International Student Support Office right now."),
    # TOPIK Korean
    ("topik", 1, "Korean", "D-2 비자 입학 요건으로 TOPIK 3급 이상이 필요합니다. 다가오는 시험 일정을 확인하세요."),
    ("topik", 2, "Korean", "곧 TOPIK 시험에 등록해야 합니다. 접수 마감이 임박했을 수 있습니다."),
    ("topik", 3, "Korean", "[긴급] 지금 즉시 TOPIK 시험에 접수하거나 아주대학교 국제교류팀에 문의하세요."),
    # TOPIK English
    ("topik", 1, "English", "TOPIK Level 3+ is required for D-2 Visa admission. Check the upcoming exam schedule."),
    ("topik", 2, "English", "You need to register for TOPIK soon. Exam registration may close shortly."),
    ("topik", 3, "English", "URGENT: Register for TOPIK immediately, or contact the Ajou International Student Office."),
]


def upgrade() -> None:
    op.create_table(
        "risk_msg",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("alarm_type", sa.String(length=10), nullable=False),
        sa.Column("risk_level", sa.SmallInteger(), nullable=False),
        sa.Column("lang", sa.String(length=10), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("alarm_type", "risk_level", "lang", name="uq_risk_msg_type_level_lang"),
    )

    op.bulk_insert(
        sa.table(
            "risk_msg",
            sa.column("alarm_type", sa.String),
            sa.column("risk_level", sa.SmallInteger),
            sa.column("lang", sa.String),
            sa.column("message", sa.Text),
        ),
        [
            {"alarm_type": alarm_type, "risk_level": risk_level, "lang": lang, "message": message}
            for alarm_type, risk_level, lang, message in SEED_ROWS
        ],
    )


def downgrade() -> None:
    op.drop_table("risk_msg")
