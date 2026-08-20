import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as any)?.apiUrl ??
  'http://localhost:8080';

const TOKEN_KEY = 'kandha.token';

let cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== null) return cachedToken;
  cachedToken = (await SecureStore.getItemAsync(TOKEN_KEY)) ?? null;
  return cachedToken;
}
export async function setToken(token: string | null) {
  cachedToken = token;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'error') { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  let body: any = null;
  try { body = await res.json(); } catch { /* empty body */ }
  if (!res.ok || body?.ok === false) {
    throw new ApiError(res.status, body?.error ?? 'Network problem', body?.code ?? 'error');
  }
  return body.data as T;
}

const get = <T,>(p: string) => request<T>(p);
const post = <T,>(p: string, body?: unknown) =>
  request<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const patch = <T,>(p: string, body: unknown) =>
  request<T>(p, { method: 'PATCH', body: JSON.stringify(body) });

/* ---------------- types ---------------- */
export type Trade = 'HEADLOAD' | 'HANDCART' | 'HANDVAN' | 'PORTER';
export type Market = { id: string; name: string };
export type City = {
  id: string; name: string; slug: string; unit: string; workerWord: string;
  langs: string[]; bandLow: number; bandHigh: number; markets: Market[];
};
export type Me = {
  id: string; phone: string; name: string | null; role: 'BOOKER' | 'WORKER' | 'ADMIN';
  lang: 'en' | 'hi' | 'bn'; cityId: string | null;
  worker?: { id: string; code: string; verify: 'PENDING' | 'VERIFIED' | 'REJECTED'; onDuty: boolean; market?: Market | null } | null;
};
export type Job = {
  id: string; ref: string; kind: 'BUSINESS' | 'PERSONAL'; trade: Trade;
  units: number; kgPerUnit: number; helpers: number;
  pickupText: string; pickupNote: string | null;
  dropText: string; fareBase: number; fareExtra: number;
  status: string; createdAt: string; expiresAt: string; lrNumber: string | null;
  market: Market; city: { id: string; name: string; unit: string };
  placesLeft?: number; fareTotal?: number; outsideMarket?: boolean;
  assignments?: Assignment[];
};
export type Assignment = {
  id: string; units: number; state: string; countWorker: number | null; countBooker: number | null;
  worker: { id: string; code: string; ratingAvg: number; lastLat?: number | null; lastLng?: number | null;
            user: { name: string | null; phone: string } };
};
export type Fare = { perUnit: number; base: number; extra: number; total: number; bandLow: number; bandHigh: number; needsTwoPerUnit: boolean };

/* ---------------- endpoints ---------------- */
export const api = {
  cities: () => get<City[]>('/geo/cities'),

  requestOtp: (phone: string) => post<{ sent: boolean; devCode?: string }>('/auth/otp/request', { phone }),
  verifyOtp: (b: { phone: string; code: string; name?: string; lang?: string; cityId?: string }) =>
    post<{ token: string; user: Me }>('/auth/otp/verify', b),
  me: () => get<Me>('/auth/me'),
  updateMe: (b: { name?: string; lang?: string; cityId?: string }) => patch<Me>('/auth/me', b),
  registerDevice: (pushToken: string, platform: string) => post('/auth/device', { pushToken, platform }),

  quote: (b: { cityId: string; units: number; kgPerUnit: number; helpers?: number; extra?: number }) =>
    post<{ fare: Fare; unit: string; helpersNeeded: number }>('/jobs/quote', b),
  createJob: (b: Record<string, unknown>) => post<{ job: Job; fare: Fare }>('/jobs', b),
  myJobs: () => get<Job[]>('/jobs/mine'),
  job: (id: string) => get<Job>(`/jobs/${id}`),
  cancelJob: (id: string, reason?: string) => post(`/jobs/${id}/cancel`, { reason }),
  bookerCount: (id: string, assignmentId: string, count: number) =>
    post<{ matched: boolean }>(`/jobs/${id}/count`, { assignmentId, count }),
  saveLr: (id: string, lrNumber: string) => post(`/jobs/${id}/lr`, { lrNumber }),
  rate: (id: string, subjectId: string, stars: number, note?: string) =>
    post(`/jobs/${id}/rate`, { subjectId, stars, note }),

  registerWorker: (b: { name: string; lang: string; trades: Trade[]; marketId: string }) =>
    post<{ worker: unknown; next: string }>('/worker/register', b),
  workerMe: () => get<any>('/worker/me'),
  setDuty: (onDuty: boolean) => post<{ onDuty: boolean }>('/worker/duty', { onDuty }),
  ping: (lat: number, lng: number) => post('/worker/ping', { lat, lng }),
  earnings: () => get<{ todayAmount: number; todayUnits: number; weekAmount: number; lifetimeJobs: number; rating: number }>('/worker/earnings'),
  board: (scope: 'mine' | 'nearby' | 'all', sort: 'near' | 'pay') =>
    get<Job[]>(`/jobs/board/open?scope=${scope}&sort=${sort}`),
  accept: (id: string) => post<Assignment>(`/jobs/${id}/accept`),
  step: (id: string, state: 'REACHED' | 'PICKED' | 'DELIVERED', count?: number) =>
    post(`/jobs/${id}/step`, { state, count }),
  running: () => get<Array<{ id: string; state: string; units: number; job: Job & { booker: { name: string | null; phone: string } } }>>('/jobs/worker/running'),
};

export const API_BASE = BASE;
