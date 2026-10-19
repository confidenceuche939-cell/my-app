import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createFakePrisma } from './fakePrisma';

const fake = vi.hoisted(() => ({ db: null as unknown }));

vi.mock('../src/lib/prisma', () => ({
  get prisma() {
    return fake.db;
  },
}));

import { app } from '../src/app';

const register = (email: string, password = 'password123') =>
  request(app).post('/api/auth/register').send({ email, password });

beforeEach(() => {
  fake.db = createFakePrisma();
});

describe('authentification', () => {
  it('inscrit un utilisateur, stocke un hash bcrypt (jamais le mot de passe) et renvoie un JWT', async () => {
    const res = await register('Alice@Example.com');
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('alice@example.com');

    const stored = (fake.db as ReturnType<typeof createFakePrisma>)._users[0];
    expect(stored.passwordHash).not.toBe('password123');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('refuse un email déjà utilisé, un email invalide et un mot de passe trop court', async () => {
    await register('a@example.com');
    expect((await register('a@example.com')).status).toBe(409);
    expect((await register('pas-un-email')).status).toBe(400);
    expect((await register('b@example.com', 'court')).status).toBe(400);
  });

  it('login : renvoie un JWT valide, erreur générique sinon', async () => {
    await register('a@example.com');

    const ok = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'password123' });
    expect(ok.status).toBe(200);
    expect(jwt.verify(ok.body.token, process.env.JWT_SECRET as string)).toHaveProperty('userId');

    const badPassword = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'mauvais-mdp' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'password123' });
    expect(badPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(badPassword.body).toEqual(unknownEmail.body);
  });
});

describe('protection des routes', () => {
  it('rejette les requêtes sans token, avec un token invalide ou signé avec un autre secret', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(401);
    expect((await request(app).get('/api/tasks').set('Authorization', 'Bearer nimporte.quoi')).status).toBe(401);

    const forged = jwt.sign({ userId: 'x' }, 'un-autre-secret-bien-different');
    expect((await request(app).get('/api/tasks').set('Authorization', `Bearer ${forged}`)).status).toBe(401);

    const expired = jwt.sign({ userId: 'x' }, process.env.JWT_SECRET as string, { expiresIn: -10 });
    expect((await request(app).get('/api/tasks').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
  });
});

describe('isolation des données entre utilisateurs', () => {
  it("l'utilisateur A ne voit, ne modifie et ne supprime pas les tâches de B", async () => {
    const a = (await register('a@example.com')).body.token as string;
    const b = (await register('b@example.com')).body.token as string;
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

    const taskA = (await request(app).post('/api/tasks').set(auth(a)).send({ title: 'Tâche de A' })).body;
    const taskB = (await request(app).post('/api/tasks').set(auth(b)).send({ title: 'Tâche de B' })).body;

    const listA = (await request(app).get('/api/tasks').set(auth(a))).body;
    const listB = (await request(app).get('/api/tasks').set(auth(b))).body;
    expect(listA.map((t: { title: string }) => t.title)).toEqual(['Tâche de A']);
    expect(listB.map((t: { title: string }) => t.title)).toEqual(['Tâche de B']);

    // B tente de modifier / supprimer la tâche de A → 404
    expect((await request(app).patch(`/api/tasks/${taskA.id}`).set(auth(b)).send({ completed: true })).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${taskA.id}`).set(auth(b))).status).toBe(404);

    // La tâche de A est intacte
    const after = (await request(app).get('/api/tasks').set(auth(a))).body;
    expect(after).toHaveLength(1);
    expect(after[0].completed).toBe(false);

    // A peut gérer ses propres tâches
    expect((await request(app).patch(`/api/tasks/${taskA.id}`).set(auth(a)).send({ completed: true })).body.completed).toBe(true);
    expect((await request(app).delete(`/api/tasks/${taskA.id}`).set(auth(a))).status).toBe(204);
    expect(taskB.userId).not.toBe(taskA.userId);
  });
});
