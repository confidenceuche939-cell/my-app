export const API_BASE: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

const TOKEN_KEY = 'task-manager.token';

// Évènement émis quand le serveur rejette le token (expiré / invalide).
export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

// fetch + header Authorization automatique. `path` commence par "/" (ex: "/tasks").
export const apiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  return res;
};
