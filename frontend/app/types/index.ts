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

export type LanguageInstituteTerm =
  | 'Term 1'
  | 'Term 2'
  | 'Term 3'
  | 'Term 4';

export type AjouAdmissionTarget =
  | 'March'
  | 'June'
  | 'September'
  | 'December';

export type VisaType = 'D-4' | 'D-2' | 'Other' | 'Unknown';

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
  category: NoticeCategory;
  summary: string;
  date: string;
  deadline?: string;
  hasAttachmentOnly?: boolean;
  isCritical?: boolean;
  description?: string;
  link?: string;
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
  languageInstituteStatus: LanguageInstituteStatus;
  languageInstituteTerm: LanguageInstituteTerm;
  targetAdmissionTerm: AjouAdmissionTarget;
  desiredMajor: string;
  visaType: VisaType;
  visaExpiryDate: string;
  visaExpiryUnknown: boolean;
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
  savedNoticeReminders: SavedNoticeReminder[];
  addNoticeReminder: (notice: Notice) => void;
  removeNoticeReminder: (noticeId: string) => void;
  toggleNoticeReminder: (notice: Notice) => void;
  toggleNoticeReminderDone: (reminderId: string) => void;

  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  isAuthInitialized: boolean;
};
