import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken } from '@/api/client';
import type { LoginResponse } from '@/api/types';

interface LoginInput {
  tenantSlug: string;
  email: string;
  password: string;
}

interface AuthState {
  isAuthenticated: boolean;
  /** Rol del operador (del token) — solo para ajustar la UI; el backend es quien realmente autoriza. */
  role: string | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** Lee el claim `role` de un JWT sin verificar la firma (uso puramente de UI). */
function roleFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json).role as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());

  const login = useCallback(async (input: LoginInput) => {
    const res = await api<LoginResponse>('/v1/auth/login', {
      method: 'POST',
      body: input,
      anonymous: true,
    });
    setToken(res.accessToken);
    setTokenState(res.accessToken);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ isAuthenticated: Boolean(token), role: roleFromToken(token), login, logout }),
    [token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
