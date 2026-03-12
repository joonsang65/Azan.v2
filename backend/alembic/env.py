# 파일 기능: Alembic 마이그레이션 실행 환경을 설정하고 메타데이터를 로드한다.
from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# app/database.py 파일에서 DATABASE_URL 변수와 BASE 객체를 가져옴
from app.database import DATABASE_URL, Base
from app import models  # noqa: F401  # Ensure SQLAlchemy models are registered on Base metadata.

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Alemnic 설정 파일 (alembic.ini) 안에 있는 sqlalchemy.url 값을 DATABASE_URL 로 덮어쓴다.
# DATABASE_URL 은 app/database.py 파일에 저장되어 있음
config.set_main_option("sqlalchemy.url", DATABASE_URL.replace("%", "%%"))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
