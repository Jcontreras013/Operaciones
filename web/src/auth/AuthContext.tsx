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
  /** Login (email o nombre corto) del operador (del token) — igual, solo UI. */
  email: string | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** Lee los claims de un JWT sin verificar la firma (uso puramente de UI). */
function claimsFromToken(token: string | null): { role: string | null; email: string | null } {
  if (!token) return { role: null, email: null };
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(json);
    return { role: (parsed.role as string | undefined) ?? null, email: (parsed.email as string | undefined) ?? null };
  } catch {
    return { role: null, email: null };
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

  const value = useMemo<AuthState>(() => {
    const claims = claimsFromToken(token);
    return { isAuthenticated: Boolean(token), role: claims.role, email: claims.email, login, logout };
  }, [token, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
