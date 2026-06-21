import { AuthTokens, AuthUser, RegisterInput, UpdateUserInput } from '@/types';
import { api, setTokens, clearTokens, buildQuery } from '@/lib/api';

export interface LoginInput {
  email: string;
  password: string;
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

export const fetchUsers = async (role?: string): Promise<AuthUser[]> => {
  return api<AuthUser[]>(buildQuery('/api/auth/users', { role }));
};

export const updateUser = async (id: string, input: UpdateUserInput): Promise<AuthUser> => {
  return api<AuthUser>(`/api/auth/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    auth: true,
  });
};

export const deleteUser = async (id: string): Promise<void> => {
  await api<void>(`/api/auth/users/${id}`, {
    method: 'DELETE',
    auth: true,
  });
};

export const logout = () => {
  clearTokens();
};
