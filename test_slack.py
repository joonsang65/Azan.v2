import os
import json # JSON을 예쁘게 출력하기 위해 import
from dotenv import load_dotenv
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

# 1. 환경 변수 로드
#    .env 파일에서 모든 키를 읽어옴
load_dotenv()

# 2. Slack 클라이언트 초기화
slack_token = os.environ.get("SLACK_BOT_TOKEN")
client = WebClient(token=slack_token)

# 3. .env에서 채널 ID 가져오기 (이게 업그레이드된 부분일세)
slack_channel_id = os.environ.get("SLACK_CHANNEL_ID")

# 4. 필수 값 확인
if not slack_token or not slack_channel_id:
    print("에러: .env 파일에 SLACK_BOT_TOKEN 또는 SLACK_CHANNEL_ID가 없습니다.")
    exit()

print(f"'{slack_channel_id}' 채널에서 메시지를 가져오는 중...")

try:
    # 5. API 호출 (conversations.history)
    #    limit=10 : 최근 메시지 10개만 가져오기
    response = client.conversations_history(channel=slack_channel_id, limit=10)
    
    messages = response.get('messages', [])
    
    if not messages:
        print("채널에서 메시지를 찾을 수 없습니다.")
        print(">>> [해결책] Slack 채널에서 '/invite @봇이름'을 입력해서 봇을 채널에 초대했는지 확인하세요.")
    else:
        print(f"--- 총 {len(messages)}개의 메시지 수신 성공 ---")
        
        # 6. [중요] 메시지 1개만 골라서 전체 JSON 구조 확인하기
        print("\n[첫 번째 메시지의 전체 JSON 구조 확인]")
        print("="*30)
        # json.dumps를 쓰면 딕셔너리를 예쁘게 출력할 수 있네
        print(json.dumps(messages[0], indent=2, ensure_ascii=False))
        print("="*30)

        # 7. [중요] 모든 메시지의 '텍스트'만 정제해서 출력하기
        print("\n[모든 메시지의 텍스트(text)만 정제]")
        print("="*30)
        for i, msg in enumerate(messages):
            text = msg.get('text')
            files = msg.get('files', []) # 첨부파일 정보도 확인
            
            print(f"--- 메시지 {i+1} ---")
            print(f"TEXT: {text}")
            if files:
                print(f"FILES: ({len(files)}개 첨부파일 감지됨)")
            print("-"*(15+len(str(i+1))))


except SlackApiError as e:
    print(f"Slack API 에러 발생: {e.response['error']}")
    # (자주 나는 에러 1) "not_in_channel"
    # -> 봇('Ajou-Bot-Test')이 자네의 '#notifications' 채널에 '멤버'로 초대되지 않았다는 뜻일세.
    #    채널에서 '/invite @Ajou-Bot-Test' 명령어로 봇을 초대해주게.
    # (자주 나는 에러 2) "invalid_auth"
    # -> SLACK_BOT_TOKEN이 틀렸다는 뜻.
except Exception as e:
    print(f"알 수 없는 에러: {e}")