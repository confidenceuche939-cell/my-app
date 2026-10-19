import 'dotenv/config';
import type { SignOptions } from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET;

// Fail fast : sans secret solide, les JWT ne protègent rien.
if (!jwtSecret || jwtSecret.length < 16) {
  throw new Error(
    'JWT_SECRET manquant ou trop court (16 caractères minimum). Voir backend/.env.example'
  );
}

export const config = {
  jwtSecret,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'],
  bcryptRounds: 10,
} as const;
