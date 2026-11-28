import { ApiError, getFriendlyErrorMessage } from '@/lib/errors';
import type { AuthTokens } from '@/types';

export const ACCESS_TOKEN_KEY = 'map-safety-access-token';
export const REFRESH_TOKEN_KEY = 'map-safety-refresh-token';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

let refreshPromise: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

export function apiUrl(path: string): string {
  return API_URL ? `${API_URL}${path.startsWith('/') ? path : `/${path}`}` : path;
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTokens(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

let sessionExpiredNotified = false;

async function parseErrorBody(res: Response): Promise<string | undefined> {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((d: { msg?: string; type?: string; ctx?: { min_length?: number } }) => {
          if (d.type === 'string_too_short' && d.ctx?.min_length) return `Mínimo de ${d.ctx.min_length} caracteres`;
          return d.msg?.replace(/^Value error, /, '');
        })
        .filter(Boolean)
        .join(', ');
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(apiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const tokens = (await res.json()) as AuthTokens;
    setTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

export async function tryRefreshToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export interface ApiOptions extends RequestInit {
  auth?: boolean;
  errorContext?: string;
  skipAuthRefresh?: boolean;
}

// --- Age of the oldest data currently shown from the offline copy (null = all fresh) ---
let cachedDataTime: number | null = null;
const cachedListeners = new Set<() => void>();

function noteCacheState(res: Response) {
  let next: number | null = null;
  if (res.headers.get('X-From-Cache') === '1') {
    const at = Number(res.headers.get('X-Cached-At'));
    next = Number.isFinite(at) && at > 0 ? at : cachedDataTime ?? 0;
  }
  if (next === null && cachedDataTime === null) return;
  // Keep the oldest offline timestamp until a fresh response arrives.
  const value = next === null ? null : cachedDataTime ? Math.min(cachedDataTime, next || cachedDataTime) : next;
  if (value === cachedDataTime) return;
  cachedDataTime = value;
  cachedListeners.forEach((l) => l());
}

export function subscribeCachedDataTime(cb: () => void) {
  cachedListeners.add(cb);
  return () => { cachedListeners.delete(cb); };
}

export function getCachedDataTime(): number | null {
  return cachedDataTime;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = false, errorContext, skipAuthRefresh = false, headers, ...rest } = options;

  const buildHeaders = (): HeadersInit => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };
    if (auth) {
      const token = getAccessToken();
      if (token) h.Authorization = `Bearer ${token}`;
    }
    return h;
  };

  const doFetch = () =>
    fetch(apiUrl(path), {
      ...rest,
      headers: buildHeaders(),
    });

  let res = await doFetch();

  if (res.status === 401 && auth && !skipAuthRefresh) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await doFetch();
    } else {
      clearTokens();
      // Many requests can fail together: notify the app only once.
      if (!sessionExpiredNotified) {
        sessionExpiredNotified = true;
        setTimeout(() => { sessionExpiredNotified = false; }, 3000);
        onSessionExpired?.();
      }
      const detail = await parseErrorBody(res);
      throw new ApiError(
        getFriendlyErrorMessage(401, detail),
        401,
        detail,
      );
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (res.ok && (!rest.method || rest.method === 'GET')) noteCacheState(res);

  if (!res.ok) {
    const detail = await parseErrorBody(res);
    throw new ApiError(
      getFriendlyErrorMessage(res.status, detail, errorContext),
      res.status,
      detail,
    );
  }

  return res.json() as Promise<T>;
}

export async function apiFormData<T>(
  path: string,
  formData: FormData,
  options: { errorContext?: string } = {},
): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    body: formData,
    ...(token && { headers: { Authorization: `Bearer ${token}` } }),
  });

  if (!res.ok) {
    const detail = await parseErrorBody(res);
    throw new ApiError(
      getFriendlyErrorMessage(res.status, detail, options.errorContext),
      res.status,
      detail,
    );
  }

  return res.json() as Promise<T>;
}

export function buildQuery(path: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}
