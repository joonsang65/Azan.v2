## 파일 기능: Alembic 신규 리비전 파일을 생성할 때 사용하는 템플릿이다.
## Alembic이 새로운 데이터베이스 migration 파일을 생성할 때 사용하는 템플릿으로, revision ID·upgrade()·downgrade() 구조를 자동으로 만들어주는 기본 스크립트 포맷을 정의하는 파일이다.
## alembic revision -m "add table" -> alembic/versions/ab1234_add_table.py


"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
