import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

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

  try {
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || typeof decoded.userId !== 'string') {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    req.user = { id: decoded.userId };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
