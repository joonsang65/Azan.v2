import type { LanguageOption } from './types';

type TranslationKey =
  | 'tabs.home'
  | 'tabs.chat'
  | 'tabs.notices'
  | 'tabs.calendar'
  | 'headers.chat'
  | 'headers.notices'
  | 'headers.calendar'
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.profile.title'
  | 'settings.profile.subtitle'
  | 'settings.language.title'
  | 'settings.language.subtitle'
  | 'settings.notifications.title'
  | 'settings.notifications.subtitle'
  | 'settings.logout.title'
  | 'settings.logout.subtitle'
  | 'settings.logout.alertTitle'
  | 'settings.logout.alertMessage'
  | 'settings.logout.cancel'
  | 'settings.language.screenTitle'
  | 'settings.language.screenSubtitle'
  | 'settings.language.korean'
  | 'settings.language.english'
  | 'settings.language.koreanSubtitle'
  | 'settings.language.englishSubtitle'
  | 'settings.language.current';

const translations: Record<LanguageOption, Record<TranslationKey, string>> = {
  Korean: {
    'tabs.home': '홈',
    'tabs.chat': '채팅',
    'tabs.notices': '공지',
    'tabs.calendar': '캘린더',
    'headers.chat': '챗봇 상담',
    'headers.notices': '공지사항',
    'headers.calendar': '캘린더',
    'settings.title': '설정',
    'settings.subtitle': '프로필, 언어, 알림 설정을 관리해보세요',
    'settings.profile.title': '내 프로필',
    'settings.profile.subtitle': '입학 및 개인 정보를 확인하고 수정해요',
    'settings.language.title': '언어',
    'settings.language.subtitle': '앱에서 사용할 언어를 선택해요',
    'settings.notifications.title': '알림 설정',
    'settings.notifications.subtitle': '중요 카테고리와 알림 빈도를 관리해요',
    'settings.logout.title': '로그아웃',
    'settings.logout.subtitle': '앱에서 로그아웃해요',
    'settings.logout.alertTitle': '로그아웃',
    'settings.logout.alertMessage': '정말 로그아웃할까요?',
    'settings.logout.cancel': '취소',
    'settings.language.screenTitle': '언어 설정',
    'settings.language.screenSubtitle': '앱에서 사용할 언어를 선택해보세요',
    'settings.language.korean': '한국어',
    'settings.language.english': '영어',
    'settings.language.koreanSubtitle': '앱 화면을 한국어로 표시합니다.',
    'settings.language.englishSubtitle': 'Display the app in English.',
    'settings.language.current': '현재 언어',
  },
  English: {
    'tabs.home': 'Home',
    'tabs.chat': 'Chat',
    'tabs.notices': 'Notices',
    'tabs.calendar': 'Calendar',
    'headers.chat': 'Chatbot',
    'headers.notices': 'Notices',
    'headers.calendar': 'Calendar',
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your profile, language, and notifications.',
    'settings.profile.title': 'My Profile',
    'settings.profile.subtitle': 'Check and edit your admission and personal information.',
    'settings.language.title': 'Language',
    'settings.language.subtitle': 'Choose the language used in the app.',
    'settings.notifications.title': 'Notifications',
    'settings.notifications.subtitle': 'Manage important categories and notification frequency.',
    'settings.logout.title': 'Logout',
    'settings.logout.subtitle': 'Sign out of the app.',
    'settings.logout.alertTitle': 'Logout',
    'settings.logout.alertMessage': 'Are you sure you want to logout?',
    'settings.logout.cancel': 'Cancel',
    'settings.language.screenTitle': 'Language Settings',
    'settings.language.screenSubtitle': 'Choose the language used in the app.',
    'settings.language.korean': 'Korean',
    'settings.language.english': 'English',
    'settings.language.koreanSubtitle': '앱 화면을 한국어로 표시합니다.',
    'settings.language.englishSubtitle': 'Display the app in English.',
    'settings.language.current': 'Current Language',
  },
};

export function t(language: LanguageOption, key: TranslationKey) {
  return translations[language][key];
}
