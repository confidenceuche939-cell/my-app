import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyToken } from './lib/token';
import { getAllowedOrigins } from './lib/origins';

// ─── Contrat des évènements (partagé avec le frontend par convention) ─────────
export interface TaskPayload {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
}

export interface ServerToClientEvents {
  'task:created': (task: TaskPayload) => void;
  'task:updated': (task: TaskPayload) => void;
  'task:deleted': (payload: { id: string }) => void;
}

interface SocketData {
  userId: string;
}

let io: Server<Record<string, never>, ServerToClientEvents, Record<string, never>, SocketData> | null = null;

const roomOf = (userId: string): string => `user:${userId}`;

// Initialise Socket.io sur le serveur HTTP.
// Chaque connexion est authentifiée avec le même JWT que l'API REST, puis placée dans
// une "room" privée de l'utilisateur : il ne reçoit JAMAIS les évènements d'un autre.
export const initSocket = (server: HttpServer): void => {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: unknown }).token;
    const userId = typeof token === 'string' ? verifyToken(token) : null;
    if (!userId) {
      next(new Error('unauthorized'));
      return;
    }
    socket.data.userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    void socket.join(roomOf(socket.data.userId));
    console.log(`[socket] connecté: ${socket.id} (user ${socket.data.userId})`);
    socket.on('disconnect', (reason) => {
      console.log(`[socket] déconnecté: ${socket.id} (${reason})`);
    });
  });
};

// Envoie un évènement à toutes les connexions (onglets/appareils) d'un utilisateur.
// Sans effet si Socket.io n'est pas initialisé (ex : tests unitaires de l'API REST).
export const emitToUser = <E extends keyof ServerToClientEvents>(
  userId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void => {
  io?.to(roomOf(userId)).emit(event, ...args);
};

export const closeSocket = async (): Promise<void> => {
  if (io) await io.close();
  io = null;
};
