import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/token';

// Ajoute `req.user` au type Request d'Express.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

// Vérifie le header "Authorization: Bearer <token>" et attache l'utilisateur à la requête.
export const protect = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  const [scheme, token] = header ? header.split(' ') : [];

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const userId = verifyToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = { id: userId };
  next();
};
