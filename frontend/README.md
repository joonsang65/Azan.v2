# frontend/

## 역할

Expo(React Native) 기반의 모바일 앱 프론트엔드입니다. 아주대학교 공지사항 키워드 알림 서비스(AZAN)의 사용자 인터페이스를 제공합니다.

## 디렉토리 구조

```
frontend/
├── App.js                # 루트 컴포넌트, 네비게이션 및 화면 라우팅
├── src/
│   ├── api.js            # API 클라이언트 및 JWT 토큰 관리
│   ├── config.js         # API 서버 주소 설정
│   └── screens/          # 각 화면(스크린) 컴포넌트
├── package.json          # 프론트엔드 의존성 패키지 목록
├── app.json              # Expo 앱 설정
└── eas.json              # EAS 빌드 설정
```

## 주요 파일 설명

### App.js — 루트 컴포넌트

앱 전체의 화면 상태와 하단 탭 네비게이션을 관리합니다.

**상태(State)**

| 변수 | 타입 | 설명 |
|------|------|------|
| `screen` | `"login" \| "signup" \| "app"` | 현재 최상위 화면 |
| `tab` | `"home" \| "chatbot" \| "notice"` | 메인 앱의 탭 |
| `noticeView` | `"list" \| "settings"` | 공지 탭 내부 뷰 |
| `selectedNoticeId` | `UUID \| null` | 선택된 공지 ID |
| `initializing` | `bool` | 초기 토큰 확인 중 여부 |

**함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `useEffect` (초기화) | — | — | 앱 시작 시 저장된 토큰 확인 후 화면 결정 |
| `handleLogout()` | — | — | 상태 초기화 후 로그인 화면으로 이동 |
| `renderAuthedContent()` | — | JSX | 현재 탭에 맞는 화면 컴포넌트 반환 |
| `onPressTab(nextTab)` | `string` | — | 탭 전환, 공지 뷰 상태 초기화 |

---

### src/api.js — API 클라이언트 및 토큰 관리

백엔드 REST API 호출 함수와 JWT 토큰의 보안 저장소 관리를 담당합니다.

**토큰 관리 함수 (expo-secure-store 사용)**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `saveToken(token)` | `string` | `Promise<void>` | JWT 토큰을 기기 보안 저장소에 저장 |
| `getToken()` | — | `Promise<string>` | 저장된 JWT 토큰 조회 |
| `deleteToken()` | — | `Promise<void>` | 저장된 토큰 삭제 |
| `clearToken()` | — | `Promise<void>` | 토큰 삭제 (deleteToken 별칭) |

**핵심 요청 함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `apiRequest(path, options?)` | `string, object?` | `Promise<data>` | 공통 HTTP 요청. Bearer 토큰 자동 주입, 8초 타임아웃, JSON 파싱 처리 |

**헬스 체크**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `pingApi()` | — | `Promise<{status}>` | `GET /health` 호출, 서버 상태 확인 |
| `pingDatabase()` | — | `Promise<{db}>` | `GET /health/db` 호출, DB 연결 확인 |

**공지 관련 함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `fetchNotices(keywordId?, q?, limit?, offset?)` | `int?, string?, int?, int?` | `Promise<{items, total}>` | 공지 목록 조회 (키워드 필터, 검색어 지원) |
| `fetchNoticeDetail(id)` | `string` | `Promise<notice>` | 공지 상세 조회 |

**키워드 관련 함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `fetchKeywords()` | — | `Promise<list[{id, keyword}]>` | 전체 키워드 목록 조회 |
| `fetchMyKeywords(token)` | `string` | `Promise<{enabled: list[int]}>` | 내 구독 키워드 ID 목록 조회 |
| `updateMyKeywords(token, enabledIds)` | `string, list[int]` | `Promise<response>` | 내 구독 키워드 업데이트 |
| `getMyKeywordsCache()` | — | `Promise<list[int]>` | 로컬 캐시에서 키워드 조회 |
| `saveMyKeywordsCache(enabledIds)` | `list[int]` | `Promise<void>` | 키워드 목록을 로컬 캐시에 저장 |

---

### src/config.js — API 서버 주소 설정

| 변수 | 값 | 설명 |
|------|----|------|
| `API_BASE_URL` | `"https://ajou-international.onrender.com"` | 백엔드 API 서버 기본 URL |

---

## 기술 스택

| 항목 | 버전 |
|------|------|
| Expo | 54.0.0 |
| React | 19.1.0 |
| React Native | 0.81.5 |
| expo-secure-store | 15.0.8 |
