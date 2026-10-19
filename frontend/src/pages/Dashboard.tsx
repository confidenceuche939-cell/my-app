import React, { useState, useEffect, useCallback } from 'react';
import type { Task } from '../types';
import { TaskCard } from '../components/TaskCard';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';


export type AppState = 'loading' | 'success' | 'empty' | 'error';

export const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<AppState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string>('');

  // ─── Fetch all tasks from the API ────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const res = await apiFetch(`/tasks`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Task[] = await res.json();
      setTasks(data);
      setStatus(data.length === 0 ? 'empty' : 'success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to load data. Please check your network connection.'
      );
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ─── Toggle completed ─────────────────────────────────────────────────────
  const handleToggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setActionError('');
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    try {
      const res = await apiFetch(`/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!res.ok) throw new Error('Failed to update task');
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: task.completed } : t))
      );
      setActionError('Impossible de mettre à jour la tâche. Réessayez.');
    }
  };

  // ─── Delete task ──────────────────────────────────────────────────────────
  const handleDeleteTask = async (id: string) => {
    const snapshot = tasks;
    setActionError('');
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    if (updated.length === 0) setStatus('empty');
    try {
      const res = await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
    } catch {
      // Revert on error
      setTasks(snapshot);
      setStatus('success');
      setActionError('Impossible de supprimer la tâche. Réessayez.');
    }
  };

  // ─── Add task ─────────────────────────────────────────────────────────────
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newTaskTitle.trim()) {
      setActionError('Veuillez saisir un titre pour la tâche.');
      return;
    }
    setIsSubmitting(true);
    setActionError('');
    try {
      const res = await apiFetch(`/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create task');
      const created: Task = await res.json();
      setTasks((prev) => [created, ...prev]);
      setNewTaskTitle('');
      setStatus('success');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Utilisateur connecté */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Connecté en tant que <strong className="text-slate-900 dark:text-slate-100">{user?.email}</strong>
          </span>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Se déconnecter
          </button>
        </div>

        {/* API Status Banner */}
        <div className="bg-indigo-900/90 text-indigo-100 backdrop-blur border border-indigo-700/50 p-4 rounded-2xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Live API — PostgreSQL via Prisma
              </h2>
            </div>
            <span className="text-xs text-indigo-300 font-mono">
              État actuel : <strong className="uppercase underline text-white">{status}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={loadTasks}
              className="py-2 px-3 rounded-xl font-medium transition-all flex items-center justify-center space-x-1.5 bg-indigo-800/60 hover:bg-indigo-700 text-indigo-200"
            >
              <span>⟳</span>
              <span>Rafraîchir les données</span>
            </button>
            <div className="py-2 px-3 rounded-xl bg-indigo-800/30 text-indigo-300 text-center font-mono text-xs flex items-center justify-center">
              Backend : localhost:3001
            </div>
          </div>
        </div>

        {/* Dashboard Main Content Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                My Tasks
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Données réelles depuis PostgreSQL
              </p>
            </div>

            {status === 'success' && (
              <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                <div className="text-center">
                  <span className="block text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {completedCount} / {tasks.length}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Terminées
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Add Form */}
          {(status === 'success' || status === 'empty') && (
            <form onSubmit={handleAddTask} className="flex gap-3">
              <input
                type="text"
                id="new-task-input"
                placeholder="Ajouter une nouvelle tâche..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
              />
              <button
                id="add-task-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-95"
              >
                {isSubmitting ? '...' : '+ Ajouter'}
              </button>
            </form>
          )}

          {/* Action error (add / toggle / delete) */}
          {actionError && (
            <div
              role="alert"
              className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300"
            >
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError('')}
                className="ml-4 text-xs font-semibold underline"
              >
                Fermer
              </button>
            </div>
          )}

          {/* 1. LOADING STATE */}
          {status === 'loading' && (
            <div className="py-16 text-center space-y-4">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 animate-spin">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Chargement depuis PostgreSQL... ⟳
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Connexion à la base de données en cours.
                </p>
              </div>
            </div>
          )}

          {/* 2. EMPTY STATE */}
          {status === 'empty' && (
            <div className="py-16 text-center space-y-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-2xl">
                📭
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  No tasks found.
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Create one using the input above!
                </p>
              </div>
            </div>
          )}

          {/* 3. ERROR STATE */}
          {status === 'error' && (
            <div className="py-12 px-6 text-center space-y-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xl font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">
                  Failed to load data.
                </h3>
                <p className="text-rose-600 dark:text-rose-400 text-sm mt-1">
                  {errorMessage || 'Une erreur est survenue lors de la récupération des tâches.'}
                </p>
                <p className="text-rose-500 dark:text-rose-500 text-xs mt-2">
                  Assurez-vous que le backend tourne sur le port 3001.
                </p>
              </div>
              <button
                type="button"
                id="retry-btn"
                onClick={loadTasks}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs shadow-md transition-all active:scale-95"
              >
                Réessayer (Retry)
              </button>
            </div>
          )}

          {/* 4. SUCCESS STATE */}
          {status === 'success' && (
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Aucune tâche dans la liste.
                </div>
              ) : (
                tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
