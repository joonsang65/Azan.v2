import { apiRequest } from './api';

export interface Keyword {
  id: number;
  keyword: string;
}

export const keywordService = {
  async getAllKeywords() {
    return await apiRequest<Keyword[]>('/keywords');
  },

  async getMyKeywords() {
    return await apiRequest<{ enabled: number[] }>('/users/me/keywords');
  },

  async updateMyKeywords(enabled: number[]) {
    return await apiRequest('/users/me/keywords', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  }
};
