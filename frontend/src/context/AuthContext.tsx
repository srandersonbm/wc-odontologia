import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api, getToken, setToken } from '../api/client';
import type { AuthUser } from '../api/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  registerDentist: (data: {
    name: string;
    email: string;
    password: string;
    specialty?: string;
  }) => Promise<AuthUser>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<AuthUser>('/auth/me');
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Após autenticar, busca o perfil completo (/auth/me) em vez de usar a resposta
  // minimalista do login — ela não traz carimbo, assinatura e demais dados do
  // consultório usados nos PDFs gerados.
  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    setToken(res.token);
    const me = await api.get<AuthUser>('/auth/me');
    setUser(me);
    return me;
  };

  const registerDentist = async (data: {
    name: string;
    email: string;
    password: string;
    specialty?: string;
  }) => {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/register-dentist', data);
    setToken(res.token);
    const me = await api.get<AuthUser>('/auth/me');
    setUser(me);
    return me;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registerDentist, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
