import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthResponse, User } from '../types';
import { AuthContext } from './AuthContext';
import { UNAUTHORIZED_EVENT, apiFetch, clearToken, getToken, setToken } from '../lib/api';

const authenticate = async (
  path: '/auth/login' | '/auth/register',
  email: string,
  password: string
): Promise<AuthResponse> => {
  let res: Response;
  try {
    res = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. Le backend est-il démarré ?');
  }

  const data = (await res.json().catch(() => null)) as (AuthResponse & { error?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.error ?? `Erreur serveur (${res.status})`);
  return data;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(() => getToken() !== null);

  // Au chargement : si un token est stocké, on vérifie qu'il est encore valide.
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;

    apiFetch('/auth/me')
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) setUser((await res.json()) as User);
        else clearToken();
      })
      .catch(() => {
        if (!cancelled) clearToken();
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Token rejeté par l'API en cours de session → retour à l'écran de connexion.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const finish = useCallback((data: AuthResponse) => {
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => finish(await authenticate('/auth/login', email, password)),
    [finish]
  );
  const register = useCallback(
    async (email: string, password: string) => finish(await authenticate('/auth/register', email, password)),
    [finish]
  );
  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isChecking, login, register, logout }),
    [user, isChecking, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
