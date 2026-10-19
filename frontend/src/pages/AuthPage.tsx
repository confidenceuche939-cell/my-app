import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

type Mode = 'login' | 'register';

export const AuthPage = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    if (isRegister && password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) await register(email, password);
      else await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setError('');
  };

  const inputClass =
    'w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Task Manager</h1>
          <p className="text-sm text-slate-500">
            {isRegister ? 'Créez votre compte' : 'Connectez-vous à votre espace'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="vous@exemple.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder={isRegister ? '8 caractères minimum' : '••••••••'}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-md shadow-indigo-500/20"
          >
            {isSubmitting ? '...' : isRegister ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
          <button type="button" onClick={switchMode} className="font-semibold text-indigo-600 hover:underline">
            {isRegister ? 'Se connecter' : "S'inscrire"}
          </button>
        </p>
      </div>
    </div>
  );
};
