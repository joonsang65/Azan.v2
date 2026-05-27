import pytest
import allure
from unittest.mock import MagicMock, patch
from workers.alarm.keyword_match.send_notifications import build_messages, send_messages

@allure.feature("푸시 알림")
@allure.story("메시지 구성")
@allure.severity(allure.severity_level.NORMAL)
@allure.description("유효한 Expo 토큰과 유효하지 않은 토큰이 섞여 있을 때 메시지 생성 여부를 테스트합니다.")
def test_build_messages_mixed_tokens():
    user_notices = {
        "user-valid": [
            {
                "user_id": "user-valid",
                "expo_push_token": "ExponentPushToken[valid]",
                "notice_id": "notice-1",
                "keyword_id": 1,
                "outbox_id": 101,
                "title": "유효 토큰 공지",
                "keyword": "입학"
            }
        ],
        "user-invalid": [
            {
                "user_id": "user-invalid",
                "expo_push_token": "invalid_token_123",
                "notice_id": "notice-2",
                "keyword_id": 2,
                "outbox_id": 102,
                "title": "무효 토큰 공지",
                "keyword": "일반"
            }
        ]
    }
    user_interests = {"user-valid": {1: 0}, "user-invalid": {2: 0}}
    with allure.step("혼합 토큰 목록으로부터 메시지 빌드"):
        results = build_messages(user_notices, user_interests)
    
    with allure.step("유효한 토큰에 대해서만 메시지가 생성되었는지 확인"):
        assert len(results) == 1, "유효 토큰에 대해서만 메시지가 생성되어야 함"
        assert results[0]["message"]["to"] == "ExponentPushToken[valid]"
        assert "입학" in results[0]["message"]["title"]

@allure.feature("푸시 알림")
@allure.story("메시지 구성")
@allure.severity(allure.severity_level.NORMAL)
@allure.description("고관심사 키워드와 저관심사 키워드가 분리되어 처리되는지 확인합니다.")
def test_build_messages_adaptive_aggregation():
    user_notices = {
        "user-1": [
            {"notice_id": "n1", "keyword_id": 10, "outbox_id": 1, "expo_push_token": "ExponentPushToken[u1]", "title": "고관심 공지", "keyword": "장학", "preview": "내용1"},
            {"notice_id": "n2", "keyword_id": 20, "outbox_id": 2, "expo_push_token": "ExponentPushToken[u1]", "title": "저관심 공지 1", "keyword": "일반", "preview": "내용2"},
            {"notice_id": "n3", "keyword_id": 20, "outbox_id": 3, "expo_push_token": "ExponentPushToken[u1]", "title": "저관심 공지 2", "keyword": "일반", "preview": "내용3"}
        ]
    }
    # Keyword 10 has 5 reads (High Interest), Keyword 20 has 0 reads (Low Interest)
    user_interests = {"user-1": {10: 5, 20: 0}}
    
    with allure.step("적응적 알림 메시지 빌드"):
        results = build_messages(user_notices, user_interests)
    
    with allure.step("결과 검증 (고관심사 1개 + 저관심사 합산 1개 = 총 2개 메시지)"):
        assert len(results) == 2
        
        # 고관심사 메시지 확인
        high_msg = next(r for r in results if "[장학]" in r["message"]["title"])
        assert high_msg["outbox_ids"] == [1]
        assert "내용1" in high_msg["message"]["body"]
        
        # 저관심사 합산 메시지 확인
        low_msg = next(r for r in results if "새 공지사항 2건" in r["message"]["title"])
        assert sorted(low_msg["outbox_ids"]) == [2, 3]

@allure.feature("푸시 알림")
@allure.story("알림 전송")
@allure.severity(allure.severity_level.CRITICAL)
@allure.description("Expo API를 통한 알림 전송 성공 시나리오를 테스트합니다.")
@patch("requests.post")
def test_send_messages_success(mock_post):
    mock_post.return_value.status_code = 200
    mock_post.return_value.json.return_value = {"data": [{"status": "ok"}]}
    
    conn = MagicMock()
    cursor_mock = conn.cursor.return_value.__enter__.return_value
    message_data = [{
        "message": {"to": "ExponentPushToken[valid]", "title": "제목", "body": "본문"},
        "outbox_ids": [101]
    }]
    with allure.step("Expo API를 통해 메시지 전송 및 성공 확인"):
        send_messages(conn, message_data)
        mock_post.assert_called_once()
        # Ensure database update was called
        cursor_mock.execute.assert_called()

@allure.feature("푸시 알림")
@allure.story("알림 전송")
@allure.severity(allure.severity_level.NORMAL)
@allure.description("Expo API 서버 에러(500) 발생 시의 예외 처리 및 로깅을 확인합니다.")
@patch("requests.post")
def test_send_messages_api_failure(mock_post):
    mock_post.return_value.status_code = 500
    mock_post.return_value.text = "Internal Server Error"
    mock_post.return_value.raise_for_status.side_effect = Exception("HTTP 500")
    
    conn = MagicMock()
    cursor_mock = conn.cursor.return_value.__enter__.return_value
    message_data = [{
        "message": {"to": "ExponentPushToken[valid]", "title": "제목", "body": "본문"},
        "outbox_ids": [101]
    }]
    with allure.step("전송 시도 및 에러 핸들링 확인"):
        send_messages(conn, message_data)
        mock_post.assert_called_once()
        # Ensure database update was called for failure
        cursor_mock.execute.assert_called()
