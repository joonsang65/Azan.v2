# frontend/src/

## 역할

React Native(Expo) 앱의 소스 코드 디렉토리입니다. API 클라이언트, 설정, 각 화면 컴포넌트를 포함합니다.

## 파일 구조

```
src/
├── api.js         # API 클라이언트 및 JWT 토큰 관리
├── config.js      # API 서버 주소 설정
└── screens/       # 각 화면(스크린) 컴포넌트
```

## 파일별 설명

### api.js — API 클라이언트

백엔드 REST API와의 통신을 담당합니다. JWT 토큰을 `expo-secure-store`에 보관하고, 모든 HTTP 요청에 자동으로 인증 헤더를 주입합니다. 자세한 함수 목록은 [frontend/README.md](../README.md)를 참고하세요.

### config.js — 설정 파일

| 변수 | 설명 |
|------|------|
| `API_BASE_URL` | 백엔드 API 서버의 기본 URL |

### screens/ — 화면 컴포넌트

각 화면에 대한 상세 설명은 [screens/README.md](./screens/README.md)를 참고하세요.

| 파일 | 화면 |
|------|------|
| `LoginScreen.js` | 로그인 |
| `SignupScreen.js` | 회원가입 |
| `HomeScreen.js` | 홈(프로필) |
| `NoticeScreen.js` | 공지사항 목록 |
| `NoticeDetailScreen.js` | 공지사항 상세 |
| `SettingsScreen.js` | 키워드 구독 설정 |
| `ChatbotScreen.js` | 챗봇 (미구현) |
