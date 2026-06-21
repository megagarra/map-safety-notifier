import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthUser } from '@/types';
import * as AuthController from '@/controllers/auth';
import { getAccessToken, setSessionExpiredHandler } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isStaff: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const logout = useCallback(() => {
    AuthController.logout();
    setUser(null);
  }, []);

  const restoreSession = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const me = await AuthController.getMe();
      setUser(me);
    } catch {
      AuthController.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      toast({
        title: 'Sessão expirada',
        description: 'Faça login novamente para continuar.',
        variant: 'destructive',
      });
      navigate('/login');
    });
  }, [navigate]);

  const login = useCallback(async (email: string, password: string) => {
    await AuthController.login({ email, password });
    const me = await AuthController.getMe();
    setUser(me);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isStaff: user?.role === 'moderator' || user?.role === 'admin',
      isModerator: user?.role === 'moderator' || user?.role === 'admin',
      isAdmin: user?.role === 'admin',
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
