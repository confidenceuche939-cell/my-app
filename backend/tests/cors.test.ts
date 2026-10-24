import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
// Le CORS ne touche pas à la base : on évite de charger le vrai client Prisma.
vi.mock('../src/lib/prisma', () => ({ prisma: {} }));

import { app } from '../src/app';
import { getAllowedOrigins } from '../src/lib/origins';

describe('getAllowedOrigins', () => {
  it('accepte plusieurs origines et retire espaces et "/" finaux', () => {
    expect(getAllowedOrigins('https://a.vercel.app/, http://localhost:5173 ')).toEqual([
      'https://a.vercel.app',
      'http://localhost:5173',
    ]);
  });
  it('retombe sur localhost si non défini ou vide', () => {
    expect(getAllowedOrigins(undefined)).toEqual(['http://localhost:5173']);
    expect(getAllowedOrigins(' , ')).toEqual(['http://localhost:5173']);
  });
});

describe('CORS (préflight)', () => {
  const preflight = (origin: string) =>
    request(app)
      .options('/api/tasks')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

  it("autorise l'origine configurée, y compris le header Authorization", async () => {
    const res = await preflight('http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-headers']).toMatch(/authorization/i);
  });

  it("n'autorise pas une origine inconnue", async () => {
    const res = await preflight('https://site-malveillant.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
