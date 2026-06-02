import pytest
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_db
from backend.app.models import UserNoticeRead
from backend.app.routers.auth import _create_access_token

@pytest.fixture
def client(override_get_db):
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_get_notice_records_history_when_authenticated(client, db_session):
    user_id_str = "550e8400-e29b-41d4-a716-446655440000"
    notice_id_str = "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d"
    token = _create_access_token(user_id_str)
    
    # 1. Unauthenticated request - should NOT record history
    response = client.get(f"/notices/{notice_id_str}")
    assert response.status_code == 200
    count = db_session.query(UserNoticeRead).count()
    assert count == 0
    
    # 2. Authenticated request - should record history
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get(f"/notices/{notice_id_str}", headers=headers)
    assert response.status_code == 200
    
    # Verify record in DB
    # We might need to refresh the session or use a fresh query to see changes if they were committed in another session
    # But client and db_session share the same engine/transactional structure in conftest.py
    read_record = db_session.query(UserNoticeRead).filter_by(
        user_id=uuid.UUID(user_id_str), 
        notice_id=uuid.UUID(notice_id_str)
    ).first()
    
    assert read_record is not None
    assert str(read_record.user_id) == user_id_str
    assert str(read_record.notice_id) == notice_id_str

def test_get_notice_with_invalid_token_does_not_crash(client, db_session):
    notice_id_str = "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d"
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get(f"/notices/{notice_id_str}", headers=headers)
    
    assert response.status_code == 200  # Should still work despite invalid token
    count = db_session.query(UserNoticeRead).count()
    assert count == 0
