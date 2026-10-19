import type { Request, Response } from 'express';
import * as TaskService from '../services/task.service';

// Les routes sont derrière `protect` : req.user est toujours défini ici.
// On revérifie par sécurité plutôt que d'utiliser un "!" qui masquerait un oubli de middleware.
const requireUserId = (req: Request, res: Response): string | null => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return userId;
};

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const tasks = await TaskService.getAllTasks(userId);
    res.status(200).json(tasks);
  } catch (error) {
    console.error('[getTasks]', error);
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
};

// ─── POST /api/tasks ──────────────────────────────────────────────────────────
export const createTask = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const { title } = (req.body ?? {}) as { title?: unknown };

  if (typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ error: 'Title is required and must be a non-empty string' });
    return;
  }

  try {
    const task = await TaskService.createTask(title.trim(), userId);
    res.status(201).json(task);
  } catch (error) {
    console.error('[createTask]', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const { id } = req.params;
  const { title, completed } = (req.body ?? {}) as { title?: unknown; completed?: unknown };

  if (title === undefined && completed === undefined) {
    res.status(400).json({ error: 'Provide at least one field to update: title or completed' });
    return;
  }
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    res.status(400).json({ error: 'Title must be a non-empty string' });
    return;
  }
  if (completed !== undefined && typeof completed !== 'boolean') {
    res.status(400).json({ error: 'Completed must be a boolean' });
    return;
  }

  const updateData: { title?: string; completed?: boolean } = {};
  if (typeof title === 'string') updateData.title = title.trim();
  if (typeof completed === 'boolean') updateData.completed = completed;

  try {
    const updated = await TaskService.updateTask(id, userId, updateData);
    if (!updated) {
      // 404 (et non 403) : on ne révèle pas l'existence d'une tâche appartenant à un autre.
      res.status(404).json({ error: `Task with id "${id}" not found` });
      return;
    }
    res.status(200).json(updated);
  } catch (error) {
    console.error('[updateTask]', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const { id } = req.params;

  try {
    const deleted = await TaskService.deleteTask(id, userId);
    if (!deleted) {
      res.status(404).json({ error: `Task with id "${id}" not found` });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error('[deleteTask]', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
