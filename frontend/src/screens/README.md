# frontend/src/screens/

## 역할

AZAN 모바일 앱의 각 화면(스크린) 컴포넌트를 담당하는 디렉토리입니다. 각 파일은 하나의 화면에 대응합니다.

---

## 파일별 설명

### LoginScreen.js — 로그인 화면

사용자가 이메일과 비밀번호로 로그인하거나, 서버 연결 상태를 테스트하는 화면입니다.

**상태(State)**

| 변수 | 타입 | 설명 |
|------|------|------|
| `email` | `string` | 입력된 이메일 |
| `password` | `string` | 입력된 비밀번호 |
| `healthRaw` | `string` | 연결 테스트 결과 문자열 |
| `loading` | `bool` | 로그인 처리 중 여부 |

**함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `handleLogin()` | — | — | 입력값 검증 후 `POST /auth/login` 호출, 성공 시 토큰 저장 및 앱 화면 이동 |
| `handleTestConnection()` | — | — | `pingApi()` 호출하여 서버 응답 결과를 `healthRaw`에 표시 |

---

### SignupScreen.js — 회원가입 화면

이메일, 비밀번호, 이름을 입력하여 회원가입하는 화면입니다.

**상태(State)**

| 변수 | 타입 | 설명 |
|------|------|------|
| `email` | `string` | 입력된 이메일 |
| `password` | `string` | 입력된 비밀번호 |
| `fullName` | `string` | 입력된 이름 |
| `loading` | `bool` | 가입 처리 중 여부 |

**함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `handleSignup()` | — | — | 모든 필드 검증 후 `POST /auth/register` + `POST /auth/login` 순서로 호출, 성공 시 토큰 저장 |

---

### HomeScreen.js — 홈(프로필) 화면

로그인된 사용자의 프로필 정보를 표시하고 로그아웃 기능을 제공합니다.

**상태(State)**

| 변수 | 타입 | 설명 |
|------|------|------|
| `profile` | `object \| null` | 사용자 정보 (`{id, email, full_name}`) |
| `loading` | `bool` | 프로필 로딩 중 여부 |

**함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `isAuthError(msg)` | `string` | `bool` | 에러 메시지가 인증 관련인지 판별 |
| `loadProfile()` | — | — | `GET /auth/me` 호출, 세션 만료 감지 시 자동 로그아웃 |
| `handleLogout()` | — | — | 토큰 삭제 후 `onLogout()` 콜백 호출 |

---

### NoticeScreen.js — 공지사항 목록 화면

전체 공지사항을 키워드 필터와 함께 표시합니다. 새로고침(pull-to-refresh) 지원.

**상태(State)**

| 변수 | 타입 | 설명 |
|------|------|------|
| `keywords` | `list` | 필터용 키워드 목록 |
| `selectedKeywordId` | `int \| null` | 선택된 키워드 필터 ID |
| `notices` | `list` | 공지 목록 |
| `loading` | `bool` | 로딩 중 여부 |
| `refreshing` | `bool` | pull-to-refresh 중 여부 |
| `error` | `string \| null` | 에러 메시지 |
| `dbUnavailable` | `bool` | DB 연결 불가 여부 |

**함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `toFriendlyMessage(msg)` | `string` | `string` | 영문 에러 메시지를 한국어 사용자 친화 메시지로 변환 |
| `loadKeywords()` | — | — | `GET /keywords` 호출, 목록 앞에 "전체" 항목 추가 |
| `loadNotices(keywordId)` | `int \| null` | — | `GET /notices` 호출, 키워드 필터 적용 |
| `loadInitial()` | — | — | DB ping → 키워드 로드 → 공지 로드 순서로 초기화 |
| `onRefresh()` | — | — | pull-to-refresh 시 `loadInitial()` 재호출 |
| `onPressKeyword(id)` | `int \| null` | — | 키워드 선택 시 필터 업데이트 및 공지 재로드 |

---

### NoticeDetailScreen.js — 공지사항 상세 화면

선택된 공지의 본문과 원문 링크를 표시합니다.

**상태(State)**

| 변수 | 타입 | 설명 |
|------|------|------|
| `notice` | `object \| null` | 공지 상세 데이터 |
| `loading` | `bool` | 로딩 중 여부 |
| `error` | `string \| null` | 에러 메시지 |

**함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `load()` | — | — | `GET /notices/{noticeId}` 호출하여 공지 상세 데이터 로드 |
| `openLink()` | — | — | `Linking.openURL(notice.url)`로 원문 링크를 외부 브라우저에서 열기 |

---

### SettingsScreen.js — 설정(키워드 구독) 화면

사용자가 알림받을 키워드를 선택하고 저장하는 화면입니다.

**상태(State)**

| 변수 | 타입 | 설명 |
|------|------|------|
| `keywords` | `list` | 전체 키워드 목록 |
| `enabledSet` | `Set<int>` | 현재 구독 중인 키워드 ID 집합 |
| `loading` | `bool` | 데이터 로딩 중 여부 |
| `saving` | `bool` | 저장 중 여부 |
| `error` | `string \| null` | 에러 메시지 |

**함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `sortedKeywords` | — | `list` | 키워드를 알파벳순으로 정렬한 메모이즈드 값 |
| `loadData()` | — | — | `GET /keywords` + `GET /users/me/keywords` 호출, 실패 시 로컬 캐시 사용 |
| `onToggleKeyword(keyId)` | `int` | — | 키워드 ID를 `enabledSet`에서 토글(추가/제거) |
| `onSave()` | — | — | `PUT /users/me/keywords` 호출하여 구독 목록 업데이트 후 로컬 캐시 저장 |

---

### ChatbotScreen.js — 챗봇 화면 (스텁)

RAG 기반 챗봇 기능을 위한 플레이스홀더 화면입니다. 현재 미구현 상태이며 향후 연결 예정입니다.
