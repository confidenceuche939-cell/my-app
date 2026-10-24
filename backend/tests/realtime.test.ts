import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import request from 'supertest';
import { io as connect } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { createFakePrisma } from './fakePrisma';

const fake = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../src/lib/prisma', () => ({
  get prisma() {
    return fake.db;
  },
}));

import { app } from '../src/app';
import { closeSocket, initSocket } from '../src/socket';

const httpServer = createServer(app);
let baseUrl = '';
const sockets: Socket[] = [];

beforeAll(async () => {
  initSocket(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  baseUrl = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await closeSocket();
  await new Promise((resolve) => httpServer.close(resolve));
});

beforeEach(() => {
  fake.db = createFakePrisma();
  sockets.splice(0).forEach((s) => s.close());
});

const signUp = async (email: string): Promise<string> =>
  (await request(app).post('/api/auth/register').send({ email, password: 'password123' })).body.token;

const open = (token: string): Promise<Socket> =>
  new Promise((resolve, reject) => {
    const s = connect(baseUrl, { auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(s);
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });

const collect = (s: Socket, events: string[]) => {
  const got: { event: string; data: unknown }[] = [];
  events.forEach((event) => s.on(event, (data) => got.push({ event, data })));
  return got;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const EVENTS = ['task:created', 'task:updated', 'task:deleted'];

describe('WebSockets', () => {
  it('refuse la connexion sans token valide', async () => {
    await expect(open('faux.token')).rejects.toThrow('unauthorized');
    await expect(open('')).rejects.toThrow('unauthorized');
  });

  it("diffuse create/update/delete à tous les onglets du MÊME utilisateur, et à personne d'autre", async () => {
    const tokenA = await signUp('a@example.com');
    const tokenB = await signUp('b@example.com');
    const tab1 = await open(tokenA);
    const tab2 = await open(tokenA);
    const other = await open(tokenB);
    const got1 = collect(tab1, EVENTS);
    const got2 = collect(tab2, EVENTS);
    const gotB = collect(other, EVENTS);
    const auth = { Authorization: `Bearer ${tokenA}` };

    const created = (await request(app).post('/api/tasks').set(auth).send({ title: 'Temps réel' })).body;
    await request(app).patch(`/api/tasks/${created.id}`).set(auth).send({ completed: true });
    await request(app).delete(`/api/tasks/${created.id}`).set(auth);
    await wait(150);

    for (const got of [got1, got2]) {
      expect(got.map((g) => g.event)).toEqual(['task:created', 'task:updated', 'task:deleted']);
      expect((got[0].data as { title: string }).title).toBe('Temps réel');
      expect((got[1].data as { completed: boolean }).completed).toBe(true);
      expect(got[2].data).toEqual({ id: created.id });
    }
    expect(gotB).toHaveLength(0);
  });

  it("n'émet rien quand l'opération échoue (404 sur la tâche d'un autre)", async () => {
    const tokenA = await signUp('a@example.com');
    const tokenB = await signUp('b@example.com');
    const taskA = (await request(app).post('/api/tasks').set({ Authorization: `Bearer ${tokenA}` }).send({ title: 'A' })).body;
    const sockA = await open(tokenA);
    const gotA = collect(sockA, EVENTS);

    const res = await request(app).delete(`/api/tasks/${taskA.id}`).set({ Authorization: `Bearer ${tokenB}` });
    await wait(100);
    expect(res.status).toBe(404);
    expect(gotA).toHaveLength(0);
  });
});
