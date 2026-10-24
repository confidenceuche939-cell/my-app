import jwt from 'jsonwebtoken';
import { config } from '../config';

// Vérifie un JWT et renvoie l'id utilisateur, ou null si le token est invalide/expiré.
// Utilisé à la fois par le middleware HTTP (protect) et par l'authentification Socket.io.
export const verifyToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || typeof decoded.userId !== 'string') return null;
    return decoded.userId;
  } catch {
    return null;
  }
};
