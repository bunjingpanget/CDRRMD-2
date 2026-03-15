import axios from 'axios';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

function parseHost(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
    return withoutProtocol.split('/')[0].split(':')[0] || null;
  }

  return trimmed.split(':')[0];
}

function unique(values: Array<string | null | undefined>) {
  const set = new Set<string>();
  values.forEach((value) => {
    if (value) {
      set.add(value);
    }
  });
  return Array.from(set);
}

function buildCandidateHosts() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return [envUrl.replace(/\/$/, '')];
  }

  const expoHostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ||
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ||
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
      ?.debuggerHost;

  const scriptHost = parseHost(
    (NativeModules as { SourceCode?: { scriptURL?: string } }).SourceCode?.scriptURL ?? null,
  );

  const expoHost = parseHost(expoHostUri ?? null);

  const hosts = unique([
    scriptHost,
    expoHost,
    Platform.OS === 'android' ? '10.0.2.2' : null,
    'localhost',
    '127.0.0.1',
  ]);

  return hosts.map((host) => `http://${host}:4000`);
}

const candidateHosts = buildCandidateHosts();
let activeHost = candidateHosts[0] ?? (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');
let resolvingHostPromise: Promise<string> | null = null;

export function setApiHost(host: string) {
  activeHost = host.replace(/\/$/, '');
  api.defaults.baseURL = `${activeHost}/api`;
}

export function getApiHost() {
  return activeHost;
}

const baseHost = activeHost;

function isConnectivityError(error: unknown) {
  const err = error as { code?: string; message?: string; response?: unknown };
  if (err?.response) {
    return false;
  }

  const code = err?.code ?? '';
  if (['ECONNABORTED', 'ERR_NETWORK', 'ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH'].includes(code)) {
    return true;
  }

  const message = String(err?.message ?? '').toLowerCase();
  return message.includes('network') || message.includes('timeout') || message.includes('connect');
}

export const api = axios.create({
  baseURL: `${baseHost}/api`,
  timeout: 15000,
});

async function isHealthyHost(host: string) {
  try {
    const response = await axios.get(`${host}/api/health`, { timeout: 5000 });
    return response?.data?.status === 'ok';
  } catch {
    return false;
  }
}

async function resolveHealthyHost() {
  for (const host of unique([activeHost, ...candidateHosts])) {
    const healthy = await isHealthyHost(host);
    if (healthy) {
      setApiHost(host);
      return host;
    }
  }

  return activeHost;
}

async function getHealthyHost() {
  if (!resolvingHostPromise) {
    resolvingHostPromise = resolveHealthyHost().finally(() => {
      resolvingHostPromise = null;
    });
  }

  return resolvingHostPromise;
}

export async function postAuth(path: '/auth/login' | '/auth/register', payload: unknown) {
  const host = await getHealthyHost();

  try {
    const response = await axios.post(`${host}/api${path}`, payload, { timeout: 15000 });
    setApiHost(host);
    return response;
  } catch (error) {
    if (!isConnectivityError(error)) {
      throw error;
    }

    const nextHost = await resolveHealthyHost();
    const response = await axios.post(`${nextHost}/api${path}`, payload, { timeout: 15000 });
    setApiHost(nextHost);
    return response;
  }
}

export async function getAuthMe() {
  const host = await getHealthyHost();

  try {
    const response = await api.get('/auth/me');
    setApiHost(host);
    return response;
  } catch (error) {
    if (!isConnectivityError(error)) {
      throw error;
    }

    const nextHost = await resolveHealthyHost();
    setApiHost(nextHost);
    return api.get('/auth/me');
  }
}

export async function putAuthMe(payload: {
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: string;
  contactNumber?: string;
}) {
  const host = await getHealthyHost();

  try {
    const response = await api.put('/auth/me', payload);
    setApiHost(host);
    return response;
  } catch (error) {
    if (!isConnectivityError(error)) {
      throw error;
    }

    const nextHost = await resolveHealthyHost();
    setApiHost(nextHost);
    return api.put('/auth/me', payload);
  }
}
