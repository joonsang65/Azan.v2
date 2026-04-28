import { apiRequest } from './api';

export interface ChatbotResponse {
  answer: string;
}

export const chatbotService = {
  async sendMessage(question: string) {
    return await apiRequest<ChatbotResponse>('/chatbot', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }
};
