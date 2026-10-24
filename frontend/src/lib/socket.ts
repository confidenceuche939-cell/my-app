import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { API_BASE, getToken } from './api';

// URL du serveur Socket.io : par défaut l'origine de l'API (http://localhost:3001),
// surchargeable avec VITE_SOCKET_URL.
const SOCKET_URL: string =
  import.meta.env.VITE_SOCKET_URL ?? new URL(API_BASE).origin;

export const createSocket = (): Socket =>
  io(SOCKET_URL, {
    // Fonction : le token est relu à chaque (re)connexion.
    auth: (cb) => cb({ token: getToken() }),
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
