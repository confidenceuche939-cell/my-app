import { useEffect, useRef, useState } from 'react';
import type { Task } from '../types';
import { createSocket } from '../lib/socket';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface Handlers {
  onCreated: (task: Task) => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: string) => void;
  /** Appelé après une RE-connexion : des évènements ont pu être manqués → recharger la liste. */
  onResync: () => void;
  /** Le serveur a refusé le token (expiré / invalide). */
  onUnauthorized: () => void;
}

// Ouvre la connexion Socket.io tant que le composant est monté et relaie les évènements
// de tâches. Gère la perte de connexion : état exposé + reconnexion automatique + resynchronisation.
export const useRealtimeTasks = (handlers: Handlers): ConnectionState => {
  const [state, setState] = useState<ConnectionState>('connecting');
  // Ref : les handlers changent à chaque rendu, mais la socket ne doit pas être recréée.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const socket = createSocket();
    let hasConnectedBefore = false;

    socket.on('connect', () => {
      setState('connected');
      if (hasConnectedBefore) handlersRef.current.onResync();
      hasConnectedBefore = true;
    });
    socket.on('disconnect', () => setState('disconnected'));
    socket.on('connect_error', (err: Error) => {
      setState('disconnected');
      if (err.message === 'unauthorized') {
        socket.disconnect();
        handlersRef.current.onUnauthorized();
      }
    });

    socket.on('task:created', (task: Task) => handlersRef.current.onCreated(task));
    socket.on('task:updated', (task: Task) => handlersRef.current.onUpdated(task));
    socket.on('task:deleted', ({ id }: { id: string }) => handlersRef.current.onDeleted(id));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  return state;
};
