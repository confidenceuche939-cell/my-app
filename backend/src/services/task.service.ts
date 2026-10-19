import { prisma } from '../lib/prisma';

// Toutes les requêtes sont filtrées par userId : un utilisateur ne voit
// (ni ne modifie) jamais les tâches d'un autre.

// ─── Get all tasks of a user ──────────────────────────────────────────────────
export const getAllTasks = async (userId: string) => {
  return prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

// ─── Get a single task (only if it belongs to the user) ───────────────────────
export const getTaskById = async (id: string, userId: string) => {
  return prisma.task.findFirst({ where: { id, userId } });
};

// ─── Create a new task owned by the user ──────────────────────────────────────
export const createTask = async (title: string, userId: string) => {
  return prisma.task.create({
    data: { title, userId },
  });
};

// ─── Update a task (returns null if not found / not owned) ────────────────────
export const updateTask = async (
  id: string,
  userId: string,
  data: { title?: string; completed?: boolean }
) => {
  const { count } = await prisma.task.updateMany({ where: { id, userId }, data });
  if (count === 0) return null;
  return prisma.task.findFirst({ where: { id, userId } });
};

// ─── Delete a task (returns false if not found / not owned) ───────────────────
export const deleteTask = async (id: string, userId: string): Promise<boolean> => {
  const { count } = await prisma.task.deleteMany({ where: { id, userId } });
  return count > 0;
};
