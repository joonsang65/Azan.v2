# 파일 기능: categories 제거 및 keywords 구조 단순화, notices의 category_key를 keyword_id로 전환한다.
"""merge categories into keywords

Revision ID: c3f2a6d8b1c0
Revises: b12d9c3e7a01
Create Date: 2026-03-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3f2a6d8b1c0"
down_revision: Union[str, None] = "b12d9c3e7a01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) keywords 컬럼 정리: key -> keyword, 불필요 컬럼 제거
    op.execute('ALTER TABLE keywords RENAME COLUMN "key" TO keyword')
    op.drop_column("keywords", "label")
    op.drop_column("keywords", "sort_order")
    op.drop_column("keywords", "created_at")

    # 2) notices에 keyword_id 추가 (일시적으로 NULL 허용)
    op.add_column("notices", sa.Column("keyword_id", sa.BigInteger(), nullable=True))

    # 3) 기존 category_key가 keywords에 없으면 추가
    op.execute(
        """
        INSERT INTO keywords (keyword)
        SELECT DISTINCT n.category_key
        FROM notices n
        WHERE n.category_key IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM keywords k WHERE k.keyword = n.category_key
          )
        """
    )

    # 4) notices.keyword_id 매핑
    op.execute(
        """
        UPDATE notices n
        SET keyword_id = k.id
        FROM keywords k
        WHERE k.keyword = n.category_key
        """
    )

    # 5) 인덱스 정리 및 FK 추가
    op.execute("DROP INDEX IF EXISTS ix_notices_category_key")
    op.execute("DROP INDEX IF EXISTS ix_notices_category_published")
    op.execute("DROP INDEX IF EXISTS idx_notices_category_key")
    op.create_index("ix_notices_keyword_id", "notices", ["keyword_id"], unique=False)
    op.create_index("ix_notices_keyword_published", "notices", ["keyword_id", "published_at"], unique=False)

    op.alter_column("notices", "keyword_id", nullable=False)
    op.create_foreign_key(
        "fk_notices_keyword_id",
        "notices",
        "keywords",
        ["keyword_id"],
        ["id"],
    )

    # 6) notices.category_key 제거
    op.drop_column("notices", "category_key")

    # 7) categories 테이블 제거
    op.drop_table("categories")


def downgrade() -> None:
    # 1) categories 테이블 복원
    op.create_table(
        "categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )

    # 2) notices.category_key 복원
    op.add_column("notices", sa.Column("category_key", sa.String(), nullable=True))

    # 3) category_key 재구성 (keyword 값을 사용)
    op.execute(
        """
        UPDATE notices n
        SET category_key = k.keyword
        FROM keywords k
        WHERE k.id = n.keyword_id
        """
    )

    # 4) keyword_id FK 제거 및 컬럼 삭제
    op.drop_constraint("fk_notices_keyword_id", "notices", type_="foreignkey")
    op.drop_index("ix_notices_keyword_published", table_name="notices")
    op.drop_index("ix_notices_keyword_id", table_name="notices")
    op.drop_column("notices", "keyword_id")

    # 5) category_key 관련 인덱스 복원
    op.create_index("ix_notices_category_key", "notices", ["category_key"], unique=False)
    op.create_index("ix_notices_category_published", "notices", ["category_key", "published_at"], unique=False)

    # 6) keywords 컬럼 복원
    op.add_column(
        "keywords",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.add_column(
        "keywords",
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "keywords",
        sa.Column("label", sa.String(), nullable=True),
    )
    op.execute("UPDATE keywords SET label = keyword WHERE label IS NULL")
    op.alter_column("keywords", "label", nullable=False)
    op.execute('ALTER TABLE keywords RENAME COLUMN keyword TO "key"')
