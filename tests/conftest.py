import json
import pytest
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

# Mock PostgreSQL types for SQLite BEFORE importing models
from sqlalchemy.types import TypeDecorator, Text, JSON
class MockVector(TypeDecorator):
    impl = Text
    cache_ok = True
    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(Text())
    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return value
    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return value

class MockArray(TypeDecorator):
    impl = JSON
    cache_ok = True
    def __init__(self, item_type, **kwargs):
        super().__init__(**kwargs)
    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(JSON())

# Monkeypatch sqlalchemy.dialects.postgresql
import sqlalchemy.dialects.postgresql as postgresql
postgresql.ARRAY = MockArray
postgresql.JSONB = JSON

# Monkeypatch pgvector
import sys
from unittest.mock import MagicMock
mock_pgvector = MagicMock()
mock_pgvector.sqlalchemy.Vector = MockVector
sys.modules["pgvector"] = mock_pgvector
sys.modules["pgvector.sqlalchemy"] = mock_pgvector.sqlalchemy

# Mock AzanChatbotService to prevent real DB connection during test collection
mock_chatbot_service = MagicMock()
sys.modules["workers.rag.src.chatbot.service"] = MagicMock()
# We don't need to patch the actual class because we mocked the module,
# but chatbot.py might still try to instantiate it.

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Provide dummy environment variables for Pydantic Settings validation
os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost/db")
os.environ.setdefault("JWT_SECRET", "test_jwt_secret_for_unit_tests")

from backend.app.database import Base, get_db
from backend.app.models import User, Notice, Keyword, UserKeyword, AlertOutbox

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# SQLite in-memory for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Load fixtures
    fixtures_dir = Path(__file__).parent / "fixtures"
    
    # Keywords
    with open(fixtures_dir / "keywords.json", "r") as f:
        keywords_data = json.load(f)
        for item in keywords_data:
            db.add(Keyword(**item))
    
    # Users
    with open(fixtures_dir / "users.json", "r") as f:
        users_data = json.load(f)
        for item in users_data:
            if "id" in item:
                item["id"] = uuid.UUID(item["id"])
            if "created_at" in item:
                item["created_at"] = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            db.add(User(**item))
            
    # Notices
    with open(fixtures_dir / "notices.json", "r") as f:
        notices_data = json.load(f)
        for item in notices_data:
            if "id" in item:
                item["id"] = uuid.UUID(item["id"])
            if "published_at" in item:
                item["published_at"] = datetime.fromisoformat(item["published_at"].replace("Z", "+00:00"))
            db.add(Notice(**item))
            
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def override_get_db(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass
    return _override_get_db
