import { api } from './apiClient';

export async function loginAdmin(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  return data as { token: string };
}
