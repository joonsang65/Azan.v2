import * as SecureStore from "expo-secure-store";

import { API_BASE_URL } from "./config";

const TOKEN_KEY = "auth_token";
const MY_KEYWORDS_CACHE_KEY = "my_enabled_keyword_ids_cache_v2";
const REQUEST_TIMEOUT_MS = 8000;

export async function saveToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = await getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  const requestUrl = `${API_BASE_URL}${path}`;
  try {
    res = await fetch(requestUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    const message = String(error?.message || error || "");
    if (message.includes("Aborted")) {
      throw new Error(`Request timeout (${REQUEST_TIMEOUT_MS}ms): ${requestUrl}`);
    }
    console.error("[apiRequest] network failure", { url: requestUrl, reason: message });
    throw new Error(`Network error: cannot reach ${API_BASE_URL}. Check hotspot/LAN and backend port 8000.`);
  } finally {
    clearTimeout(timeoutId);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_error) {
    data = null;
  }

  if (!res.ok) {
    console.error("[apiRequest] request failed", {
      url: requestUrl,
      status: res.status,
      body: data,
    });
    if (data && typeof data === "object") {
      if ("detail" in data) {
        throw new Error(String(data.detail));
      }
      if ("error" in data) {
        throw new Error(String(data.error));
      }
    }
    throw new Error(`HTTP ${res.status}`);
  }

  return data;
}

export async function pingApi() {
  return apiRequest("/health");
}

export async function pingDatabase() {
  return apiRequest("/health/db");
}

export async function fetchNotices(keywordId = null, q = "", limit = 30, offset = 0) {
  const params = new URLSearchParams();
  if (keywordId !== null && keywordId !== undefined) {
    params.append("keyword_id", String(keywordId));
  }
  if (q && q.trim()) {
    params.append("q", q.trim());
  }
  params.append("limit", String(limit));
  params.append("offset", String(offset));
  return apiRequest(`/notices?${params.toString()}`);
}

export async function fetchNoticeDetail(id) {
  return apiRequest(`/notices/${id}`);
}

export async function fetchKeywords() {
  return apiRequest("/keywords");
}

export async function fetchMyKeywords(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  return apiRequest("/users/me/keywords", { headers });
}

export async function updateMyKeywords(token, enabledIds) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const payload = Array.isArray(enabledIds) ? enabledIds : [];
  const response = await apiRequest("/users/me/keywords", {
    method: "PUT",
    headers,
    body: JSON.stringify({ enabled: payload }),
  });
  const normalized = Array.isArray(response?.enabled) ? response.enabled : payload;
  await saveMyKeywordsCache(normalized);
  return response;
}

export async function getMyKeywordsCache() {
  try {
    const raw = await SecureStore.getItemAsync(MY_KEYWORDS_CACHE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  } catch (_error) {
    return [];
  }
}

export async function saveMyKeywordsCache(enabledIds) {
  const payload = JSON.stringify(Array.isArray(enabledIds) ? enabledIds : []);
  await SecureStore.setItemAsync(MY_KEYWORDS_CACHE_KEY, payload);
}
