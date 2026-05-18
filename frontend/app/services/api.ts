import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const getToken = async () => {
  return await SecureStore.getItemAsync('userToken');
};

export const saveToken = async (token: string) => {
  await SecureStore.setItemAsync('userToken', token);
};

export const clearToken = async () => {
  await SecureStore.deleteItemAsync('userToken');
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not defined in frontend/.env');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return null as T;
    }

    if (!response.ok) {
      if (response.status === 401) {
        await clearToken();
        throw new Error('Invalid or expired token');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Request Failed: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error(`Network request error to ${API_BASE_URL}${endpoint}:`, error);
    if (error.message === 'Network request failed') {
      throw new Error(`Cannot connect to the server. Check the API URL (${API_BASE_URL}) and firewall settings.`);
    }
    throw error;
  }
}
