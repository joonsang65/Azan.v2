import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { fetchNotices } from '../services/notices';
import { authService } from '../services/auth';
import { keywordService } from '../services/keywords';
import type {
    AppContextType,
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
  preferredLanguage: 'English',
  residenceType: 'Dormitory',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userProfileStatus, setUserProfileStatus] = useState<UserProfileStatus>(initialUserProfileStatus);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>('English');
  const [selectedNoticeCategories, setSelectedNoticeCategories] = useState<NoticeCategory[]>([]);
  const [notificationFrequency, setNotificationFrequency] = useState<NotificationFrequency>('Medium');
  
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [noticesError, setNoticesError] = useState<string | null>(null);
  const [savedNoticeReminders, setSavedNoticeReminders] = useState<SavedNoticeReminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // 1. 초기 데이터 로드 (프로필 & 키워드)
  useEffect(() => {
    async function initSession() {
      try {
        const me = await authService.getMe();
        if (me) {
          setUserProfileStatus(prev => ({
            ...prev,
            name: me.full_name,
            email: me.email
          }));
          
          // 사용자의 구독 키워드 가져오기
          const myKeys = await keywordService.getMyKeywords();
          if (myKeys?.enabled) {
            setSelectedNoticeCategories(myKeys.enabled.map(id => mapIdToCategory(id)));
          }
        }
      } catch (e) {
        console.log("Session init failed or no user logged in");
      }
    }
    initSession();
    refreshNotices();
  }, []);

  async function refreshNotices() {
    try {
      setNoticesLoading(true);
      setNoticesError(null);
      const nextNotices = await fetchNotices();
      setNotices(nextNotices);
    } catch (error) {
      setNoticesError(error instanceof Error ? error.message : 'Failed to load notices.');
    } finally {
      setNoticesLoading(false);
    }
  }

  // 알림 토큰 업데이트 (로그인 후 호출 권장)
  async function syncPushToken(token: string) {
    try {
      await authService.updatePushToken(token);
    } catch (e) {
      console.error("Failed to sync push token");
    }
  }

  // 키워드 업데이트 연동
  async function updateCategories(categoriesOrUpdater: NoticeCategory[] | ((prev: NoticeCategory[]) => NoticeCategory[])) {
    let nextCategories: NoticeCategory[];
    if (typeof categoriesOrUpdater === 'function') {
      nextCategories = categoriesOrUpdater(selectedNoticeCategories);
    } else {
      nextCategories = categoriesOrUpdater;
    }
    
    setSelectedNoticeCategories(nextCategories);
    try {
      const allKeys = await keywordService.getAllKeywords();
      const enabledIds = allKeys
        .filter(k => nextCategories.includes(k.keyword as NoticeCategory))
        .map(k => k.id);
      await keywordService.updateMyKeywords(enabledIds);
    } catch (e) {
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
        savedNoticeReminders,
        toggleNoticeReminder,
        addNoticeReminder: () => {}, // Not used in new UI
        removeNoticeReminder: (id) => setSavedNoticeReminders(p => p.filter(i => i.noticeId !== id)),
        toggleNoticeReminderDone: (id) => setSavedNoticeReminders(p => p.map(i => i.id === id ? {...i, isDone: !i.isDone} : i)),
        tasks,
        setTasks,
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

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
