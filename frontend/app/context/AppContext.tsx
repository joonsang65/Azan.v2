import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { fetchNotices } from '../services/notices';
import { authService } from '../services/auth';
import { getToken } from '../services/api';
import { keywordService } from '../services/keywords';
import type {
    AppContextType,
    InterestCategory,
    LanguageOption,
    Notice,
    NoticeCategory,
    NotificationFrequency,
    SavedNoticeReminder,
    Task,
    UserProfileStatus,
} from '../types';

const initialUserProfileStatus: UserProfileStatus = {
  name: 'Student',
  email: '',
  nationality: '',
  currentStatus: 'Planned',
  languageSchoolSemester: '1',
  languageInstituteStatus: 'Planned',
  languageInstituteTerm: 'Term 1',
  targetAdmissionTerm: 'September',
  desiredMajor: '',
  visaType: 'D-2',
  visaExpiryDate: '',
  visaExpiryUnknown: false,
  topikStatus: 'None',
  topikLevel: 'Level 4',
  topikTargetLevel: 'Level 4',
  topikTestPlan: 'Scheduled',
  interests: [],
  preferredLanguage: 'Korean',
  residenceType: 'Dormitory',
};

const WEEKLY_DEMO_NOTICE_IDS = [
  'demo-oia-short-term-2026',
  'demo-topik-106th-2026',
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userProfileStatus, setUserProfileStatus] = useState<UserProfileStatus>(initialUserProfileStatus);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>('Korean');
  const [selectedNoticeCategories, setSelectedNoticeCategories] = useState<NoticeCategory[]>([]);
  const [notificationFrequency, setNotificationFrequency] = useState<NotificationFrequency>('Medium');
  
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [noticesError, setNoticesError] = useState<string | null>(null);
  const [savedNoticeReminders, setSavedNoticeReminders] = useState<SavedNoticeReminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
<<<<<<< HEAD
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
=======
  const [statusCheckedAt, setStatusCheckedAt] = useState<string | null>(null);
>>>>>>> fe77fbc2 (feat: update frontend)

  // 1. 초기 데이터 로드 (프로필 & 키워드)
  useEffect(() => {
    async function initSession() {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }

        const me = await authService.getMe();
        if (me) {
          const profileData: UserProfileStatus = {
            ...initialUserProfileStatus,
            name: me.full_name,
            email: me.email,
            preferredLanguage: (me as any).preferred_language || initialUserProfileStatus.preferredLanguage,
            // 다른 필드들도 필요시 업데이트
          };

          setUserProfileStatus(profileData);
          setSelectedLanguage(profileData.preferredLanguage);
          
<<<<<<< HEAD
          try {
            const myKeys = await keywordService.getMyKeywords();
            if (myKeys?.enabled) {
              setSelectedNoticeCategories(myKeys.enabled.map(id => mapIdToCategory(id)));
            }
          } catch (e) {
            console.error("Failed to load keywords", e);
=======
          // 사용자의 구독 키워드 가져오기
          const myKeys = await keywordService.getMyKeywords();
          if (myKeys?.enabled) {
            const categories = myKeys.enabled.map(id => mapIdToCategory(id));
            setSelectedNoticeCategories(categories);
            setUserProfileStatus((prev) => ({
              ...prev,
              interests: categories.map(mapCategoryToInterest),
            }));
>>>>>>> fe77fbc2 (feat: update frontend)
          }
        }
      } catch (e) {
        console.log("Session init failed or no user logged in");
      } finally {
        setIsAuthInitialized(true);
      }
    }
    initSession();
    refreshNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshNotices() {
    try {
      setNoticesLoading(true);
      setNoticesError(null);
      const nextNotices = await fetchNotices();
      const noticesWithDemo = withWeeklyDemoNotices(nextNotices);
      setNotices(noticesWithDemo);
      ensureWeeklyDemoReminders(noticesWithDemo);
    } catch (error) {
      setNoticesError(error instanceof Error ? error.message : 'Failed to load notices.');
    } finally {
      setNoticesLoading(false);
    }
  }

  async function refreshCurrentStatus() {
    try {
      setNoticesLoading(true);
      setNoticesError(null);

      const token = await getToken();
      const [nextNotices, me] = await Promise.all([
        fetchNotices(),
        token ? authService.getMe().catch(() => null) : Promise.resolve(null),
      ]);

      const noticesWithDemo = withWeeklyDemoNotices(nextNotices);
      setNotices(noticesWithDemo);
      ensureWeeklyDemoReminders(noticesWithDemo);

      if (me) {
        const profileData: UserProfileStatus = {
          ...initialUserProfileStatus,
          name: me.full_name,
          email: me.email,
          languageInstituteStatus: (me as any).language_institute_status || initialUserProfileStatus.languageInstituteStatus,
          languageInstituteTerm: (me as any).language_institute_term || initialUserProfileStatus.languageInstituteTerm,
          targetAdmissionTerm: (me as any).target_admission_term || initialUserProfileStatus.targetAdmissionTerm,
          desiredMajor: (me as any).desired_major || initialUserProfileStatus.desiredMajor,
          visaType: (me as any).visa_type || initialUserProfileStatus.visaType,
          visaExpiryDate: (me as any).visa_expiry_date || initialUserProfileStatus.visaExpiryDate,
          visaExpiryUnknown: (me as any).visa_expiry_unknown ?? initialUserProfileStatus.visaExpiryUnknown,
          topikStatus: (me as any).topik_status || initialUserProfileStatus.topikStatus,
          topikLevel: (me as any).topik_level || initialUserProfileStatus.topikLevel,
          topikTargetLevel: (me as any).topik_target_level || initialUserProfileStatus.topikTargetLevel,
          topikTestPlan: (me as any).topik_test_plan || initialUserProfileStatus.topikTestPlan,
          nationality: (me as any).nationality || initialUserProfileStatus.nationality,
          currentStatus: (me as any).current_status || initialUserProfileStatus.currentStatus,
          languageSchoolSemester:
            (me as any).language_school_semester || initialUserProfileStatus.languageSchoolSemester,
          preferredLanguage: (me as any).preferred_language || initialUserProfileStatus.preferredLanguage,
          residenceType: (me as any).residence_type || initialUserProfileStatus.residenceType,
        };

        setUserProfileStatus(profileData);
      }

      setStatusCheckedAt(new Date().toISOString());
    } catch (error) {
      setNoticesError(error instanceof Error ? error.message : 'Failed to load notices.');
    } finally {
      setNoticesLoading(false);
    }
  }

  // 알림 토큰 업데이트 (로그인 후 호출 권장)
  // 키워드 업데이트 연동
  async function updateCategories(categoriesOrUpdater: NoticeCategory[] | ((prev: NoticeCategory[]) => NoticeCategory[])) {
    let nextCategories: NoticeCategory[];
    if (typeof categoriesOrUpdater === 'function') {
      nextCategories = categoriesOrUpdater(selectedNoticeCategories);
    } else {
      nextCategories = categoriesOrUpdater;
    }
    
    setSelectedNoticeCategories(nextCategories);
    setUserProfileStatus((prev) => ({
      ...prev,
      interests: nextCategories.map(mapCategoryToInterest),
    }));
    try {
      const allKeys = await keywordService.getAllKeywords();
      const enabledIds = allKeys
        .filter(k => nextCategories.includes(k.keyword as NoticeCategory))
        .map(k => k.id);
      await keywordService.updateMyKeywords(enabledIds);
    } catch {
      console.error("Failed to update keywords on server");
    }
  }

  function toggleNoticeReminder(notice: Notice) {
    setSavedNoticeReminders((prev) => {
      const isExist = prev.some((item) => item.noticeId === notice.id);
      if (isExist) return prev.filter((item) => item.noticeId !== notice.id);

      const reminder: SavedNoticeReminder = {
        id: `reminder-${notice.id}`,
        noticeId: notice.id,
        title: notice.title,
        dueDate: notice.deadline || notice.date,
        category: notice.category,
        summary: notice.summary,
        link: notice.link,
        isDone: false,
        savedAt: new Date().toISOString(),
      };
      return [...prev, reminder].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    });
  }

  function ensureWeeklyDemoReminders(sourceNotices: Notice[]) {
    setSavedNoticeReminders((prev) => {
      const existingIds = new Set(prev.map((item) => item.noticeId));
      const demoReminders = sourceNotices
        .filter((notice) => WEEKLY_DEMO_NOTICE_IDS.includes(notice.id))
        .filter((notice) => !existingIds.has(notice.id))
        .map((notice) => ({
          id: `reminder-${notice.id}`,
          noticeId: notice.id,
          title: notice.title,
          dueDate: notice.deadline || notice.date,
          category: notice.category,
          summary: notice.summary,
          link: notice.link,
          isDone: false,
          savedAt: new Date().toISOString(),
        }));

      if (demoReminders.length === 0) {
        return prev;
      }

      return [...prev, ...demoReminders].sort((a, b) =>
        a.dueDate.localeCompare(b.dueDate)
      );
    });
  }

  return (
    <AppContext.Provider
      value={{
        userProfileStatus,
        setUserProfileStatus,
        selectedLanguage,
        setSelectedLanguage,
        selectedNoticeCategories,
        setSelectedNoticeCategories: updateCategories,
        notificationFrequency,
        setNotificationFrequency,
        notices,
        setNotices,
        noticesLoading,
        noticesError,
        refreshNotices,
        refreshCurrentStatus,
        statusCheckedAt,
        savedNoticeReminders,
        toggleNoticeReminder,
        addNoticeReminder: () => {}, // Not used in new UI
        removeNoticeReminder: (id) => setSavedNoticeReminders(p => p.filter(i => i.noticeId !== id)),
        toggleNoticeReminderDone: (id) => setSavedNoticeReminders(p => p.map(i => i.id === id ? {...i, isDone: !i.isDone} : i)),
        tasks,
        setTasks,
        isAuthInitialized,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

function mapIdToCategory(id: number): NoticeCategory {
  // 실제 DB ID와 매핑 로직 필요 (임시)
  const map: Record<number, NoticeCategory> = {
    1: 'Visa',
    2: 'TOPIK',
    3: 'Academic',
    4: 'Events',
    5: 'Scholarship',
    6: 'Dormitory'
  };
  return map[id] || 'Academic';
}

function mapCategoryToInterest(category: NoticeCategory): InterestCategory {
  switch (category) {
    case 'Academic':
      return 'Admission';
    case 'Dormitory':
    case 'Events':
      return 'Life';
    default:
      return category;
  }
}

function withWeeklyDemoNotices(sourceNotices: Notice[]): Notice[] {
  const existingIds = new Set(sourceNotices.map((notice) => notice.id));
  const demoNotices = getWeeklyDemoNotices().filter(
    (notice) => !existingIds.has(notice.id)
  );

  return [...demoNotices, ...sourceNotices].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}

function getWeeklyDemoNotices(): Notice[] {
  const { weekEndKey } = getCurrentWeekBoundsForDemo();
  const dayBeforeWeekEndKey = getDateOffsetKey(weekEndKey, -1);

  return [
    {
      id: 'demo-oia-short-term-2026',
      title: '[국제교류팀] 2026 해외단기파견 프로그램 참가자 모집',
      category: 'Academic',
      summary:
        'OIA 공지 검증용: 아주포털 및 구글폼 지원서를 마감 전 제출해야 합니다.',
      date: '2026-05-15',
      deadline: dayBeforeWeekEndKey,
      isCritical: true,
      description:
        '아주대학교 국제협력처 OIA 홈페이지의 2026 하계 3차 해외단기파견 프로그램 모집 공지를 바탕으로 한 이번 주 캘린더/진행률 검증용 일정입니다.',
      link: 'https://www.ajou.ac.kr/oia/index.do',
    },
    {
      id: 'demo-topik-106th-2026',
      title: '제106회 한국어능력시험(TOPIK) 시험일 확인',
      category: 'TOPIK',
      summary:
        'TOPIK 공지 검증용: 시험 일정과 수험표/응시 유의사항을 확인하세요.',
      date: '2026-05-16',
      deadline: weekEndKey,
      isCritical: true,
      description:
        'TOPIK 접수 시스템의 2026년 시험 일정 확인 흐름을 바탕으로 한 이번 주 캘린더/진행률 검증용 일정입니다.',
      link: 'https://register.topik.go.kr/main.do',
    },
  ];
}

function getCurrentWeekBoundsForDemo() {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStartKey: formatDateKeyForDemo(monday),
    weekEndKey: formatDateKeyForDemo(sunday),
  };
}

function getDateOffsetKey(dateKey: string, offsetDays: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return formatDateKeyForDemo(date);
}

function formatDateKeyForDemo(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
