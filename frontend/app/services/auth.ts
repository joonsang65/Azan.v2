import { apiRequest, saveToken, clearToken } from './api';

export interface UserProfile {
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

  async updateMe(fullName: string) {
    return await apiRequest<UserProfile>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ full_name: fullName }),
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
