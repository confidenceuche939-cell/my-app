import { randomUUID } from 'crypto';

// Mini "base de données" en mémoire qui imite les seules méthodes Prisma utilisées par l'API.
// Permet de tester auth + isolation sans PostgreSQL.
interface UserRow { id: string; email: string; passwordHash: string; createdAt: Date }
interface TaskRow {
  id: string; title: string; completed: boolean;
  createdAt: Date; updatedAt: Date; userId: string;
}

export const createFakePrisma = () => {
  const users: UserRow[] = [];
  const tasks: TaskRow[] = [];

  const matches = (row: Record<string, unknown>, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => value === undefined || row[key] === value);

  return {
    _users: users,
    _tasks: tasks,
    user: {
      findUnique: async ({ where }: { where: Partial<UserRow> }) =>
        users.find((u) => matches(u as unknown as Record<string, unknown>, where)) ?? null,
      create: async ({ data }: { data: { email: string; passwordHash: string } }) => {
        const row: UserRow = { id: randomUUID(), createdAt: new Date(), ...data };
        users.push(row);
        return row;
      },
    },
    task: {
      findMany: async ({ where }: { where: { userId: string } }) =>
        tasks.filter((t) => t.userId === where.userId).reverse(),
      findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
        tasks.find((t) => t.id === where.id && t.userId === where.userId) ?? null,
      create: async ({ data }: { data: { title: string; userId: string } }) => {
        const now = new Date();
        const row: TaskRow = { id: randomUUID(), completed: false, createdAt: now, updatedAt: now, ...data };
        tasks.push(row);
        return row;
      },
      updateMany: async ({ where, data }: { where: { id: string; userId: string }; data: Partial<TaskRow> }) => {
        const found = tasks.filter((t) => t.id === where.id && t.userId === where.userId);
        found.forEach((t) => Object.assign(t, data, { updatedAt: new Date() }));
        return { count: found.length };
      },
      deleteMany: async ({ where }: { where: { id: string; userId: string } }) => {
        const before = tasks.length;
        for (let i = tasks.length - 1; i >= 0; i--) {
          if (tasks[i].id === where.id && tasks[i].userId === where.userId) tasks.splice(i, 1);
        }
        return { count: before - tasks.length };
      },
    },
  };
};
