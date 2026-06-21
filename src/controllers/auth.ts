import { AuthTokens, AuthUser, UserRole } from '@/types';
import { api, setTokens, clearTokens } from '@/lib/api';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  role: UserRole;
}

export const login = async (input: LoginInput): Promise<AuthTokens> => {
  const tokens = await api<AuthTokens>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
    skipAuthRefresh: true,
    errorContext: 'login',
  });
  setTokens(tokens);
  return tokens;
};

export const getMe = async (): Promise<AuthUser> => {
  return api<AuthUser>('/api/auth/me', { auth: true });
};

export const registerUser = async (input: RegisterInput): Promise<AuthUser> => {
  return api<AuthUser>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: true,
  });
};

export const logout = () => {
  clearTokens();
};
