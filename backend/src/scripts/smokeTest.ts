// Test de fumée d'un déploiement : vérifie santé, CORS, base de données, auth,
// isolation minimale et WebSocket sur l'API EN LIGNE.
//
//   npm run smoke -- <url-backend> <url-frontend>
//   ex : npm run smoke -- https://task-manager-api.onrender.com https://mon-app.vercel.app
//   npm run smoke -- https://... https://... > ../smoke-log.txt    (preuve pour le mentor)
//
// Note : le 1er appel peut prendre ~1 minute si l'offre gratuite était en veille.

import { io } from 'socket.io-client';

const [apiArg, frontendArg] = process.argv.slice(2);
if (!apiArg || !frontendArg) {
  console.error('Usage : npm run smoke -- <url-backend> <url-frontend>');
  process.exit(1);
}
const ORIGIN = apiArg.replace(/\/+$/, '').replace(/\/api$/, '');
const FRONTEND = frontendArg.replace(/\/+$/, '');
const API = `${ORIGIN}/api`;

let failures = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  if (!ok) failures++;
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? `  →  ${detail}` : ''}`);
};

const call = async (method: string, path: string, token?: string, body?: unknown) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  const text = await res.text();
  return { status: res.status, data: text ? (JSON.parse(text) as Record<string, unknown>) : null };
};

const waitForEvent = (token: string, trigger: () => Promise<unknown>): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = io(ORIGIN, { auth: { token }, transports: ['websocket'], reconnection: false });
    const finish = (ok: boolean) => {
      socket.close();
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), 15_000);
    socket.on('connect_error', () => {
      clearTimeout(timer);
      finish(false);
    });
    socket.on('task:created', () => {
      clearTimeout(timer);
      finish(true);
    });
    socket.on('connect', () => void trigger());
  });

const main = async (): Promise<void> => {
  console.log(`\n=== Smoke test — API ${API} — front ${FRONTEND} — ${new Date().toISOString()} ===\n`);

  const healthRes = await fetch(`${ORIGIN}/health`, { signal: AbortSignal.timeout(90_000) }).catch(() => null);
  check('Backend joignable (GET /health)', healthRes?.status === 200, healthRes ? `HTTP ${healthRes.status}` : 'aucune réponse');
  if (healthRes?.status !== 200) throw new Error('Backend injoignable, arrêt.');

  const pre = await fetch(`${API}/tasks`, {
    method: 'OPTIONS',
    headers: {
      Origin: FRONTEND,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization',
    },
  });
  const allow = pre.headers.get('access-control-allow-origin');
  check('CORS : le frontend est autorisé', allow === FRONTEND, `Access-Control-Allow-Origin = ${allow ?? '(absent)'}`);

  const email = `smoke.${Date.now()}@example.com`;
  const reg = await call('POST', '/auth/register', undefined, { email, password: 'smoke-test-123' });
  check('Base de données + inscription (POST /auth/register)', reg.status === 201, `HTTP ${reg.status}`);
  if (reg.status !== 201) throw new Error(`Inscription impossible : ${JSON.stringify(reg.data)}`);
  const token = reg.data?.token as string;

  const login = await call('POST', '/auth/login', undefined, { email, password: 'smoke-test-123' });
  check('Login renvoie un JWT', login.status === 200 && typeof login.data?.token === 'string', `HTTP ${login.status}`);

  const anon = await call('GET', '/tasks');
  check('Route protégée sans token → 401', anon.status === 401, `HTTP ${anon.status}`);

  const created = await call('POST', '/tasks', token, { title: 'Smoke test' });
  check('Création de tâche (écriture en base)', created.status === 201, `HTTP ${created.status}`);
  const list = await call('GET', '/tasks', token);
  const titles = Array.isArray(list.data) ? (list.data as { title: string }[]).map((t) => t.title) : [];
  check('Lecture de la tâche (persistance)', titles.includes('Smoke test'), JSON.stringify(titles));

  const gotEvent = await waitForEvent(token, () => call('POST', '/tasks', token, { title: 'Smoke ws' }));
  check('WebSocket : évènement task:created reçu en temps réel', gotEvent);

  console.log(failures === 0 ? '\n🎉 Déploiement OK.\n' : `\n💥 ${failures} contrôle(s) en échec.\n`);
  process.exitCode = failures === 0 ? 0 : 1;
};

main().catch((err) => {
  console.error('Erreur :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
