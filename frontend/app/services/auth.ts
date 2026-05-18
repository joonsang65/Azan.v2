import { apiRequest, saveToken, clearToken } from './api';
import type { UserProfileStatus } from '../types';

export interface UserProfile extends Partial<UserProfileStatus> {
  id: string;
  email: string;
  full_name: string;
}

export const authService = {
  async login(email: string, password: string) {
    const data = await apiRequest<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await saveToken(data.access_token);
    return data;
  },

  async register(email: string, full_name: string, password: string) {
    return await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, full_name, password }),
    });
  },

  async getMe() {
    return await apiRequest<UserProfile>('/auth/me');
  },

  async updateMe(profile: Partial<UserProfileStatus>) {
    // 벡엔드 필드명(snake_case)과 프론트엔드 필드명(camelCase) 매핑
    const body: any = {
      full_name: profile.name,
      language_institute_status: profile.languageInstituteStatus,
      language_institute_term: profile.languageInstituteTerm,
      target_admission_term: profile.targetAdmissionTerm,
      desired_major: profile.desiredMajor,
      visa_type: profile.visaType,
      visa_expiry_date: profile.visaExpiryDate && profile.visaExpiryDate.trim() !== '' ? profile.visaExpiryDate : null,
      visa_expiry_unknown: profile.visaExpiryUnknown,
      topik_status: profile.topikStatus,
      topik_level: profile.topikLevel,
      topik_target_level: profile.topikTargetLevel,
      topik_test_plan: profile.topikTestPlan,
      preferred_language: profile.preferredLanguage,
      residence_type: profile.residenceType,
      nationality: profile.nationality,
      current_status: profile.currentStatus,
      language_school_semester: profile.languageSchoolSemester,
    };

    return await apiRequest<UserProfile>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async logout() {
    await clearToken();
  },

  async updatePushToken(token: string) {
    return await apiRequest('/auth/push-token', {
      method: 'PUT',
      body: JSON.stringify({ token }),
    });
  }
};
