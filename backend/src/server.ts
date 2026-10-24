import { createServer } from 'http';
import { config } from './config'; // charge .env et vérifie JWT_SECRET avant tout
import { app } from './app';
import { initSocket } from './socket';

void config;

const PORT = process.env.PORT ?? 3001;

// Socket.io a besoin du serveur HTTP natif (et non de `app.listen`).
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Backend running at http://localhost:${PORT}`);
  console.log(`   Health:    http://localhost:${PORT}/health`);
  console.log(`   Auth:      http://localhost:${PORT}/api/auth`);
  console.log(`   Tasks:     http://localhost:${PORT}/api/tasks (JWT requis)`);
  console.log(`   WebSocket: ws://localhost:${PORT} (JWT requis)\n`);
});
