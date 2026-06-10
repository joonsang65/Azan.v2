import type React from 'react';

export type NoticeCategory =
  | 'Visa'
  | 'TOPIK'
  | 'Academic'
  | 'Events'
  | 'Scholarship'
  | 'Dormitory';

export type LanguageOption = 'English' | 'Korean';

export type ResidenceType = 'Dormitory' | 'Off-campus';

export type LanguageInstituteStatus =
  | 'Planned'
  | 'Enrolled'
  | 'Completed';

export type LanguageInstituteTerm = string;

export type AjouAdmissionTarget = string;

export type CurrentStatus = 'Planned' | 'LanguageSchool';
export type LanguageSchoolSemester = LanguageInstituteTerm;

export type VisaType = 'D-4' | 'D-2' | 'Other';

export type TopikStatus = 'None' | 'Passed';

export type TopikLevel =
  | 'Level 1'
  | 'Level 2'
  | 'Level 3'
  | 'Level 4'
  | 'Level 5'
  | 'Level 6';

export type TopikTargetLevel = TopikLevel | 'None';

export type TopikTestPlan =
  | 'Scheduled'
  | 'PlanningToRegister'
  | 'NoPlan';

export type InterestCategory =
  | 'Visa'
  | 'TOPIK'
  | 'Admission'
  | 'Scholarship'
  | 'Life';

export type NotificationFrequency = 'Low' | 'Medium' | 'High';

export type Notice = {
  id: string;
  title: string;
  titleEng?: string;
  category: NoticeCategory;
  summary: string;
  date: string;
  deadline?: string;
  hasAttachmentOnly?: boolean;
  isCritical?: boolean;
  description?: string;
  engBody?: string;
  link?: string;
  imageUrls?: string[];
};

export type Task = {
  id: string;
  title: string;
  dueDate: string;
  category: NoticeCategory | 'General';
  isDone: boolean;
  progress?: number;
};

export type SavedNoticeReminder = {
  id: string;
  noticeId: string;
  title: string;
  dueDate: string;
  category: NoticeCategory;
  summary: string;
  link?: string;
  isDone: boolean;
  savedAt: string;
};

export type UserProfileStatus = {
  name: string;
  email: string;
  nationality?: string;
  currentStatus?: CurrentStatus;
  languageSchoolSemester?: LanguageSchoolSemester;
  languageInstituteStatus: LanguageInstituteStatus;
  languageInstituteTerm: LanguageInstituteTerm;
  targetAdmissionTerm: AjouAdmissionTarget;
  desiredMajor: string;
  visaType: VisaType;
  visaExpiryDate: string;
  topikStatus: TopikStatus;
  topikLevel: TopikLevel;
  topikTargetLevel: TopikTargetLevel;
  topikTestPlan: TopikTestPlan;
  interests: InterestCategory[];
  preferredLanguage: LanguageOption;
  residenceType: ResidenceType;
};

export type AppContextType = {
  userProfileStatus: UserProfileStatus;
  setUserProfileStatus: React.Dispatch<React.SetStateAction<UserProfileStatus>>;

  selectedLanguage: LanguageOption;
  setSelectedLanguage: React.Dispatch<React.SetStateAction<LanguageOption>>;

  selectedNoticeCategories: NoticeCategory[];
  setSelectedNoticeCategories: React.Dispatch<
    React.SetStateAction<NoticeCategory[]>
  >;

  notificationFrequency: NotificationFrequency;
  setNotificationFrequency: React.Dispatch<
    React.SetStateAction<NotificationFrequency>
  >;

  notices: Notice[];
  setNotices: React.Dispatch<React.SetStateAction<Notice[]>>;
  noticesLoading: boolean;
  noticesError: string | null;
  refreshNotices: () => Promise<void>;
  refreshCurrentStatus: () => Promise<void>;
  statusCheckedAt: string | null;
  savedNoticeReminders: SavedNoticeReminder[];
  addNoticeReminder: (notice: Notice) => void;
  removeNoticeReminder: (noticeId: string) => void;
  toggleNoticeReminder: (notice: Notice) => void;
  toggleNoticeReminderDone: (reminderId: string) => void;

  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  isAuthInitialized: boolean;
};
