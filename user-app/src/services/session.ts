import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export type SessionUser = {
  id: number;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: string;
  contactNumber?: string;
};

export type SessionData = {
  token: string;
  user: SessionUser;
  appUserId?: string;
};

const SESSION_KEY = '@cddrmd:user_session';

export async function saveSession(session: SessionData) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  api.defaults.headers.common.Authorization = `Bearer ${session.token}`;
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
  delete api.defaults.headers.common.Authorization;
}

export async function loadSession(): Promise<SessionData | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionData;
    if (!parsed?.token || !parsed?.user) {
      return null;
    }
    api.defaults.headers.common.Authorization = `Bearer ${parsed.token}`;
    return parsed;
  } catch {
    return null;
  }
}
