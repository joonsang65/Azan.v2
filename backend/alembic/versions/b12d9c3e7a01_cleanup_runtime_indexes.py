# 파일 기능: 런타임에서 생성되던 인덱스를 정리하고 사용자 키워드 인덱스를 추가한다.
"""cleanup runtime indexes

Revision ID: b12d9c3e7a01
Revises: e97b8af26a78
Create Date: 2026-03-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b12d9c3e7a01"
down_revision: Union[str, None] = "e97b8af26a78"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 런타임 패치로 생성되던 인덱스가 있다면 정리한다.
    op.execute("DROP INDEX IF EXISTS idx_notices_category_key")
    op.execute("DROP INDEX IF EXISTS ix_alert_outbox_status")

    # ORM에서 사용되는 패턴에 맞춰 사용자 키워드의 user_id 인덱스를 추가한다.
    op.create_index("ix_user_keywords_user_id", "user_keywords", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_keywords_user_id", table_name="user_keywords")

    # 이전 런타임 패치 상태로 되돌리기 위해 인덱스를 재생성한다.
    op.execute("CREATE INDEX IF NOT EXISTS idx_notices_category_key ON notices (category_key)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_alert_outbox_status ON alert_outbox (status)")
