# Guide de déploiement

Architecture cible : **Vercel** (frontend) → **Render** (API + WebSocket) → **PostgreSQL** (Neon ou Render).

```
Navigateur ──HTTPS──► Vercel (frontend statique)
     │
     ├──HTTPS (REST + JWT)──► Render (Express)  ──Prisma──► PostgreSQL
     └──WSS  (Socket.io + JWT)─┘
```

Ordre à respecter : **1. base de données → 2. backend → 3. frontend → 4. retour sur le backend pour le CORS → 5. vérification**.

## 0. Avant de commencer

- Le code est sur GitHub (`git push`). Vérifiez avec `git status` que `backend/.env` n'est **pas** suivi par Git.
- Si un vrai mot de passe de base ou un `JWT_SECRET` a déjà été poussé sur GitHub, changez-le.

## 1. Base de données PostgreSQL

Choisissez **une** option.

**Option A — Neon (recommandée pour un projet à présenter longtemps).**
Créez un projet sur [neon.tech](https://neon.tech), copiez la *connection string* **directe** (non « pooled ») :
`postgresql://user:motdepasse@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`

**Option B — PostgreSQL de Render** (*New + → PostgreSQL*, copiez l'**Internal Database URL** si le backend est aussi sur Render dans la même région, sinon l'**External**).
⚠️ Une base **gratuite** Render est supprimée environ 30 jours après sa création (14 jours de grâce) : à éviter si le mentor ou un recruteur doit tester le site plus tard. Vérifiez les conditions actuelles sur render.com.

## 2. Backend sur Render

1. [render.com](https://render.com) → **New + → Web Service** → connectez le dépôt GitHub.
2. Réglages :

| Champ | Valeur |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Instance type | Free (ou Starter pour supprimer la mise en veille) |

   (Alternative : **New + → Blueprint** utilise le fichier `render.yaml` à la racine.)

3. **Environment** → ajoutez :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | la chaîne de connexion de l'étape 1 |
| `JWT_SECRET` | une longue valeur aléatoire (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) — **différente** de celle de votre `.env` local |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_VERSION` | `22` |
| `CORS_ORIGIN` | laissez provisoirement `http://localhost:5173`, à corriger à l'étape 4 |

4. **Create Web Service**. Dans les logs de déploiement vous devez voir :
   - `prisma generate` puis la compilation TypeScript,
   - `Applying migration ... add_auth` (les migrations s'appliquent automatiquement au démarrage grâce à `prisma migrate deploy`),
   - `Backend running at ...`.
5. Ouvrez `https://<votre-service>.onrender.com/health` : vous devez obtenir `{"status":"ok",...}`.

## 3. Frontend sur Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importez le dépôt.
2. Réglages :

| Champ | Valeur |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite (détecté automatiquement) |
| Build Command / Output | `npm run build` / `dist` |

3. **Environment Variables** :

| Variable | Valeur |
|---|---|
| `VITE_API_URL` | `https://<votre-service>.onrender.com/api` (avec `/api`) |

4. **Deploy**, puis notez l'URL (`https://<projet>.vercel.app`).
   ⚠️ Les variables `VITE_*` sont intégrées **au moment du build** : si vous les modifiez, relancez un déploiement (*Redeploy*).

## 4. Autoriser le frontend côté backend (CORS)

Sur Render → service → **Environment** → `CORS_ORIGIN` = `https://<projet>.vercel.app`
(plusieurs URL possibles, séparées par des virgules, ex : `https://<projet>.vercel.app,http://localhost:5173`). Render redéploie automatiquement. Cette valeur sert aussi pour Socket.io.

## 5. Vérifier

**Automatiquement** (depuis `backend/`, après `npm install`) :

```bash
npm run smoke -- https://<service>.onrender.com https://<projet>.vercel.app
npm run smoke -- https://<service>.onrender.com https://<projet>.vercel.app > ../smoke-log.txt
```

Le script contrôle : santé du backend, **CORS** pour l'URL du frontend, **connexion à la base** (inscription), login/JWT, routes protégées, écriture/lecture en base, et **WebSocket** temps réel. Le premier appel peut durer ~1 minute si l'offre gratuite était en veille.

**À la main** (ce que fera le mentor) : ouvrez le site → créez un compte → ajoutez/cochez/supprimez des tâches → rechargez (les données persistent) → ouvrez une 2ᵉ fenêtre avec le même compte (mises à jour en temps réel) → créez un 2ᵉ compte (il ne voit pas les tâches du premier). Dans les DevTools (onglet Network), aucune erreur CORS en rouge.

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Erreur CORS dans la console | `CORS_ORIGIN` ne correspond pas à l'URL exacte du frontend | Corrigez-la (https, pas de faute, pas d'ancien domaine de preview) et attendez le redéploiement |
| « Impossible de joindre le serveur » | `VITE_API_URL` absente/erronée au moment du build, ou backend en veille | Vérifiez la variable (avec `/api`) puis *Redeploy* ; patientez ~1 min si veille |
| Le service plante : `JWT_SECRET manquant` | Variable absente sur Render | Ajoutez-la |
| `P1001: Can't reach database server` | `DATABASE_URL` erronée ou `?sslmode=require` manquant (Neon) | Recopiez la chaîne complète |
| `P3009` / migration échouée | Migration précédente interrompue | Corrigez puis, sur une base de test, réinitialisez-la (`prisma migrate reset` en local avec l'URL distante) |
| Badge « Hors ligne — reconnexion… » | Backend en veille ou `CORS_ORIGIN` incorrect pour le WebSocket | Même correction que CORS ; la reconnexion est automatique |
| 401 partout après redéploiement | `JWT_SECRET` modifié : les anciens tokens sont invalides | Se déconnecter / se reconnecter |

## Limites de l'offre gratuite (à connaître avant de soumettre)

- Le service Render gratuit **s'endort après ~15 min d'inactivité** ; la première requête met ~1 min. Ouvrez le site vous-même juste avant la revue du mentor, et mentionnez-le dans le README.
- Base Render gratuite : expiration au bout de ~30 jours (voir étape 1).
- Les déploiements de *preview* Vercel ont une URL différente : ajoutez-les à `CORS_ORIGIN` si vous les utilisez.

## Alternative : Railway

Même principe : service avec *Root Directory* `backend`, mêmes commandes et variables, base PostgreSQL ajoutée depuis le dashboard (la variable `DATABASE_URL` peut référencer celle de la base).
