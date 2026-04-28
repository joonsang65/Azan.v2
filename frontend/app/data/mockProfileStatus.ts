// app/data/mockProfileStatus.ts

import { UserProfileStatus } from '../types';

export const mockProfileStatus: UserProfileStatus = {
  name: 'Student',
  email: 'student@example.com',
  languageInstituteStatus: 'Planned',
  languageInstituteTerm: 'Term 1',
  targetAdmissionTerm: 'September',
  desiredMajor: 'Digital Media',
  visaType: 'D-2',
  visaExpiryDate: '2026-08-31',
  visaExpiryUnknown: false,
  topikStatus: 'None',
  topikLevel: 'Level 4',
  topikTargetLevel: 'Level 4',
  topikTestPlan: 'Scheduled',
  interests: ['Visa', 'TOPIK', 'Scholarship'],
  preferredLanguage: 'English',
  residenceType: 'Dormitory',
};
