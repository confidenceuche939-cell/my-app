import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../lib/prisma';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Hash factice : permet de dépenser le même temps de calcul quand l'email n'existe pas
// (évite de révéler quels emails sont inscrits).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', config.bcryptRounds);

const signToken = (userId: string): string =>
  jwt.sign({ userId }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn,
  });

const readCredentials = (req: Request): { email: string; password: string } | null => {
  const body = (req.body ?? {}) as { email?: unknown; password?: unknown };
  if (typeof body.email !== 'string' || typeof body.password !== 'string') return null;
  return { email: body.email.trim().toLowerCase(), password: body.password };
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  const credentials = readCredentials(req);
  if (!credentials || !EMAIL_RE.test(credentials.email)) {
    res.status(400).json({ error: 'A valid email is required' });
    return;
  }
  if (credentials.password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: credentials.email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(credentials.password, config.bcryptRounds);
    const user = await prisma.user.create({
      data: { email: credentials.email, passwordHash },
    });

    res.status(201).json({ token: signToken(user.id), user: { id: user.id, email: user.email } });
  } catch (error) {
    // P2002 = violation d'unicité Prisma (deux inscriptions simultanées avec le même email)
    if ((error as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    console.error('[register]', error);
    res.status(500).json({ error: 'Failed to register' });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  const credentials = readCredentials(req);
  if (!credentials) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: credentials.email } });
    const valid = await bcrypt.compare(credentials.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    res.status(200).json({ token: signToken(user.id), user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('[login]', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
};

// ─── GET /api/auth/me (protégée) ──────────────────────────────────────────────
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }
    res.status(200).json({ id: user.id, email: user.email });
  } catch (error) {
    console.error('[me]', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
};
