import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
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
  languageSchoolSemester: '2026.03',
  languageInstituteStatus: 'Planned',
  languageInstituteTerm: '2026.03',
  targetAdmissionTerm: '2026.09',
  desiredMajor: '',
  visaType: 'D-2',
  visaExpiryDate: '',
  topikStatus: 'None',
  topikLevel: 'Level 4',
  topikTargetLevel: 'Level 4',
  topikTestPlan: 'Scheduled',
  interests: [],
  preferredLanguage: 'Korean',
  residenceType: 'Dormitory',
};

export async function registerPushToken(): Promise<void> {
  const Device = await import('expo-device');
  const Notifications = await import('expo-notifications');

  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } = existing === 'granted'
    ? { status: existing }
    : await Notifications.requestPermissionsAsync();

  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  console.log('[PushToken]', token);
  await authService.updatePushToken(token);
}

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
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [statusCheckedAt, setStatusCheckedAt] = useState<string | null>(null);

  // Load the saved session, profile, keywords, and notices on app start.
  useEffect(() => {
    async function initSession() {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }

        const me = await authService.getMe();
        registerPushToken().catch(e => console.warn('[PushToken] registration failed', e));
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
          setSelectedLanguage(profileData.preferredLanguage);
          
          try {
            const [myKeys, allKeys] = await Promise.all([
              keywordService.getMyKeywords(),
              keywordService.getAllKeywords(),
            ]);
            if (myKeys?.enabled && allKeys) {
              const idToName: Record<number, string> = Object.fromEntries(allKeys.map(k => [k.id, k.keyword]));
              const categories = [...new Set(
                myKeys.enabled
                  .map(id => mapKeywordNameToCategory(idToName[id] || ''))
                  .filter((c): c is NoticeCategory => c !== null)
              )];
              setSelectedNoticeCategories(categories);
              setUserProfileStatus((prev) => ({
                ...prev,
                interests: categories.map(mapCategoryToInterest),
              }));
            }
          } catch (e) {
            console.error("Failed to load keywords", e);
          // Keep local profile state usable even if keyword loading fails.
          }
        }
      } catch {
        console.log("Session init failed or no user logged in");
      } finally {
        setIsAuthInitialized(true);
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

  async function refreshCurrentStatus() {
    try {
      setNoticesLoading(true);
      setNoticesError(null);

      const token = await getToken();
      const [nextNotices, me] = await Promise.all([
        fetchNotices(),
        token ? authService.getMe().catch(() => null) : Promise.resolve(null),
      ]);

      setNotices(nextNotices);

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
        setSelectedLanguage(profileData.preferredLanguage);
      }

      setStatusCheckedAt(new Date().toISOString());
    } catch (error) {
      setNoticesError(error instanceof Error ? error.message : 'Failed to load notices.');
    } finally {
      setNoticesLoading(false);
    }
  }

  // Sync keyword subscriptions with the backend.
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
        .filter(k => nextCategories.some(cat =>
          categoryToKeywordNames(cat).includes(k.keyword.toLowerCase())
        ))
        .map(k => k.id);
      await keywordService.updateMyKeywords(enabledIds);
    } catch {
      console.error("Failed to update keywords on server");
    }
  }

  function toggleNoticeReminder(notice: Notice) {
    // If deadline is missing, do not allow adding to reminders
    if (!notice.deadline) {
      return;
    }

    setSavedNoticeReminders((prev) => {
      const isExist = prev.some((item) => item.noticeId === notice.id);
      if (isExist) return prev.filter((item) => item.noticeId !== notice.id);

      const reminder: SavedNoticeReminder = {
        id: `reminder-${notice.id}`,
        noticeId: notice.id,
        title: notice.title,
        dueDate: notice.deadline, // notice.date removed since notice.deadline is guaranteed here
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

function mapKeywordNameToCategory(keyword: string): NoticeCategory | null {
  const lower = (keyword || '').toLowerCase();
  if (lower === 'visa') return 'Visa';
  if (lower === 'topik') return 'TOPIK';
  if (lower === 'scholarship') return 'Scholarship';
  if (lower === 'undergrad_register' || lower === 'grad_register' || lower === 'academic') return 'Academic';
  if (lower === 'life' || lower === 'events') return 'Events';
  if (lower === 'dormitory' || lower === 'dorm') return 'Dormitory';
  return null;
}

function categoryToKeywordNames(cat: NoticeCategory): string[] {
  switch (cat) {
    case 'Visa': return ['visa'];
    case 'TOPIK': return ['topik'];
    case 'Scholarship': return ['scholarship'];
    case 'Academic': return ['academic', 'undergrad_register', 'grad_register'];
    case 'Events': return ['events', 'life'];
    case 'Dormitory': return ['dormitory', 'dorm'];
    default: return [];
  }
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

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
