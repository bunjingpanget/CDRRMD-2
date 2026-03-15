import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const ADMIN_TOKEN_KEY = 'admin_token';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

let currentAuthToken: string | null = null;

function getStoredToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

function applyAuthorizationHeader(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

// Initialize header from persisted storage so the first protected request has auth.
currentAuthToken = getStoredToken();
applyAuthorizationHeader(currentAuthToken);

api.interceptors.request.use((config) => {
  const token = currentAuthToken || getStoredToken();

  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  return config;
});

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
  applyAuthorizationHeader(token);
}
