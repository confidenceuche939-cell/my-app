// Démo d'isolation : crée deux comptes (A et B) sur le serveur EN COURS D'EXÉCUTION
// et prouve que chacun ne voit que ses propres tâches.
//
//   npm run dev                      (dans un terminal)
//   npm run demo:isolation           (dans un autre)
//   npm run demo:isolation > isolation-log.txt   (pour garder la preuve)

const BASE = process.env.API_URL ?? 'http://localhost:3001/api';
const stamp = Date.now();

interface AuthBody { token: string; user: { id: string; email: string } }
interface TaskBody { id: string; title: string; userId?: string; completed: boolean }

let failures = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  if (!ok) failures++;
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? `  →  ${detail}` : ''}`);
};

const call = async (method: string, path: string, token?: string, body?: unknown) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
};

const main = async (): Promise<void> => {
  console.log(`\n=== Démo d'isolation — ${BASE} — ${new Date().toISOString()} ===\n`);

  console.log('— 1. Création des comptes');
  const a = await call('POST', '/auth/register', undefined, { email: `user.a.${stamp}@example.com`, password: 'password-A-123' });
  const b = await call('POST', '/auth/register', undefined, { email: `user.b.${stamp}@example.com`, password: 'password-B-123' });
  check('Inscription utilisateur A', a.status === 201, `HTTP ${a.status}, ${a.data?.user?.email}`);
  check('Inscription utilisateur B', b.status === 201, `HTTP ${b.status}, ${b.data?.user?.email}`);
  if (a.status !== 201 || b.status !== 201) throw new Error('Inscription impossible, arrêt.');
  const tokenA = (a.data as AuthBody).token;
  const tokenB = (b.data as AuthBody).token;

  console.log('\n— 2. Login');
  const login = await call('POST', '/auth/login', undefined, { email: `user.a.${stamp}@example.com`, password: 'password-A-123' });
  check('Login A renvoie un JWT', login.status === 200 && typeof login.data?.token === 'string', `HTTP ${login.status}`);
  const bad = await call('POST', '/auth/login', undefined, { email: `user.a.${stamp}@example.com`, password: 'mauvais' });
  check('Login avec mauvais mot de passe refusé', bad.status === 401, `HTTP ${bad.status}`);

  console.log('\n— 3. Routes protégées');
  const noToken = await call('GET', '/tasks');
  check('GET /tasks sans token → 401', noToken.status === 401, `HTTP ${noToken.status}`);
  const badToken = await call('GET', '/tasks', 'token.invalide.xyz');
  check('GET /tasks avec faux token → 401', badToken.status === 401, `HTTP ${badToken.status}`);

  console.log('\n— 4. Chacun crée une tâche');
  const taskA = await call('POST', '/tasks', tokenA, { title: 'Tâche privée de A' });
  const taskB = await call('POST', '/tasks', tokenB, { title: 'Tâche privée de B' });
  check('A crée sa tâche', taskA.status === 201, `HTTP ${taskA.status}`);
  check('B crée sa tâche', taskB.status === 201, `HTTP ${taskB.status}`);
  const idA = (taskA.data as TaskBody).id;

  console.log('\n— 5. Isolation des listes');
  const listA = await call('GET', '/tasks', tokenA);
  const listB = await call('GET', '/tasks', tokenB);
  const titlesA = (listA.data as TaskBody[]).map((t) => t.title);
  const titlesB = (listB.data as TaskBody[]).map((t) => t.title);
  check('A ne voit que ses tâches', titlesA.length === 1 && titlesA[0] === 'Tâche privée de A', JSON.stringify(titlesA));
  check('B ne voit que ses tâches', titlesB.length === 1 && titlesB[0] === 'Tâche privée de B', JSON.stringify(titlesB));

  console.log('\n— 6. B tente d\'attaquer la tâche de A');
  const patch = await call('PATCH', `/tasks/${idA}`, tokenB, { completed: true });
  const del = await call('DELETE', `/tasks/${idA}`, tokenB);
  check('B ne peut pas modifier la tâche de A (404)', patch.status === 404, `HTTP ${patch.status}`);
  check('B ne peut pas supprimer la tâche de A (404)', del.status === 404, `HTTP ${del.status}`);
  const stillThere = await call('GET', '/tasks', tokenA);
  const intact = (stillThere.data as TaskBody[]).find((t) => t.id === idA);
  check('La tâche de A est intacte', !!intact && intact.completed === false);

  console.log(failures === 0 ? '\n🎉 Tous les contrôles sont passés.\n' : `\n💥 ${failures} contrôle(s) en échec.\n`);
  process.exitCode = failures === 0 ? 0 : 1;
};

main().catch((err) => {
  console.error('Erreur :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
