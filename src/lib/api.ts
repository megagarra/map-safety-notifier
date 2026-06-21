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

async function parseErrorBody(res: Response): Promise<string | undefined> {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ');
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

async function tryRefreshToken(): Promise<boolean> {
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
      onSessionExpired?.();
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
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    body: formData,
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
