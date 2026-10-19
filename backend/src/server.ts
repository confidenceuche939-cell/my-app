import { config } from './config'; // charge .env et vérifie JWT_SECRET avant tout
import { app } from './app';

void config;

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Backend running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Auth:   http://localhost:${PORT}/api/auth`);
  console.log(`   Tasks:  http://localhost:${PORT}/api/tasks (JWT requis)\n`);
});
