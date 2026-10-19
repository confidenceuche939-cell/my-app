# Task Manager — Full-Stack App

Application de gestion de tâches multi-utilisateurs : **React + TypeScript + Tailwind** (frontend) et **Express + TypeScript + Prisma + PostgreSQL** (backend), avec authentification **JWT** et mots de passe hachés (**bcrypt**).

- Frontend déployé : `<URL Vercel/Netlify à ajouter>`
- API déployée (optionnel) : `<URL du backend à ajouter>`

---

## Structure

```
my-app/
├── frontend/               # React + Vite + Tailwind v3
│   └── src/
│       ├── components/     # TaskCard.tsx
│       ├── pages/          # Dashboard.tsx (états loading / empty / error)
│       ├── types/          # Interface Task
│       ├── App.tsx
│       └── main.tsx
├── backend/                # Express + TypeScript + Prisma
│   ├── prisma/schema.prisma
│   └── src/
│       ├── middleware/     # authMiddleware.ts (protect)
│       ├── routes/         # authRoutes.ts, task.routes.ts
│       ├── controllers/    # authController.ts, task.controller.ts
│       ├── services/       # task.service.ts (requêtes filtrées par userId)
│       ├── scripts/        # isolationDemo.ts (preuve d'isolation A/B)
│       ├── lib/prisma.ts   # singleton PrismaClient
│       ├── config.ts       # JWT_SECRET (vérifié au démarrage)
│       ├── app.ts          # application Express
│       └── server.ts
│   └── tests/              # tests Vitest + Supertest
└── README.md
```

## Prérequis

- Node.js v18+
- PostgreSQL installé et démarré

## Installation

### 1. Cloner

```bash
git clone <url-du-depot>
cd my-app
```

### 2. Base de données et backend

```sql
CREATE DATABASE taskmanager_db;
```

```bash
cd backend
cp .env.example .env      # puis renseignez DATABASE_URL et JWT_SECRET
npm install
npm run db:migrate        # crée les tables User et Task (nom de migration : add_auth)
npm run dev               # http://localhost:3001
```

### 3. Frontend (nouveau terminal)

```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:3001/api
npm install
npm run dev               # http://localhost:5173
```

## Variables d'environnement

| Fichier | Variable | Rôle |
|---|---|---|
| `backend/.env` | `DATABASE_URL` | Connexion PostgreSQL |
| `backend/.env` | `JWT_SECRET` | Secret de signature des JWT (16+ caractères, **obligatoire**) |
| `backend/.env` | `JWT_EXPIRES_IN` | Durée de validité du token (défaut `7d`) |
| `backend/.env` | `PORT` | Port du serveur (3001) |
| `backend/.env` | `CORS_ORIGIN` | URL du frontend autorisée |
| `frontend/.env` | `VITE_API_URL` | URL de l'API (avec `/api`) |

## Référence de l'API

Base URL : `http://localhost:3001`

| Méthode | Endpoint | Description | Corps | Réponse |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Crée un compte, renvoie un JWT | `{ "email", "password" (8+ car.) }` | `201` `{ token, user }` |
| `POST` | `/api/auth/login` | Connexion, renvoie un JWT | `{ "email", "password" }` | `200` `{ token, user }` |
| `GET` | `/api/auth/me` | Utilisateur courant 🔒 | — | `200` `{ id, email }` |
| `GET` | `/api/tasks` 🔒 | Liste **vos** tâches (plus récentes d'abord) | — | `200` `Task[]` |
| `POST` | `/api/tasks` 🔒 | Crée une tâche | `{ "title": "string" }` | `201` `Task` |
| `PATCH` | `/api/tasks/:id` 🔒 | Modifie titre et/ou état | `{ "title"?: "string", "completed"?: boolean }` | `200` `Task` |
| `DELETE` | `/api/tasks/:id` 🔒 | Supprime une tâche | — | `204` |
| `GET` | `/health` | Health check | — | `200` `{ status, timestamp }` |

🔒 = header `Authorization: Bearer <token>` obligatoire.

Erreurs : `400` (validation), `401` (token absent/invalide/expiré, identifiants incorrects), `404` (tâche introuvable **ou appartenant à un autre utilisateur**), `409` (email déjà utilisé), `500` (erreur serveur), toutes au format `{ "error": "message" }`.

### Modèle Task

```json
{
  "id": "uuid",
  "title": "string",
  "completed": false,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "userId": "uuid du propriétaire"
}
```

### Exemples

```bash
# 1. Inscription (ou /api/auth/login) → récupérer le token
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}'

# 2. Utiliser le token
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title": "Learn Prisma"}'

curl -X PATCH http://localhost:3001/api/tasks/<id> \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"completed": true}'

curl -X DELETE http://localhost:3001/api/tasks/<id> -H "Authorization: Bearer <token>"
```

## Authentification

**Fonctionnement**
1. `POST /api/auth/register` : le mot de passe est haché avec **bcrypt** (10 tours, sel intégré) ; seul le hash (`passwordHash`) est stocké. Un JWT (HS256, 7 jours par défaut) est renvoyé.
2. `POST /api/auth/login` : compare le mot de passe au hash. Réponse identique (`401 Invalid email or password`) que l'email existe ou non, pour ne pas révéler les comptes inscrits.
3. Le middleware `protect` (`src/middleware/authMiddleware.ts`) vérifie le JWT du header `Authorization: Bearer <token>` et place `req.user.id` sur la requête.
4. Toutes les routes `/api/tasks` passent par `protect`, et **chaque requête Prisma est filtrée par `userId`** (`src/services/task.service.ts`). Une tâche d'un autre utilisateur renvoie `404`.
5. Côté frontend, le token est conservé dans `localStorage` et ajouté automatiquement à chaque appel (`src/lib/api.ts`). Un `401` ramène à l'écran de connexion.

**Choix de sécurité**
- `JWT_SECRET` obligatoire : le serveur refuse de démarrer sans lui.
- Mot de passe : 8 caractères minimum ; email normalisé en minuscules et unique.
- Limite connue : `localStorage` est exposé en cas de faille XSS ; pour la production, un cookie `httpOnly` serait plus sûr. Pas non plus de limitation de débit (rate limiting) sur le login.

### Vérifier que les mots de passe sont hachés

```bash
cd backend && npx prisma studio       # table User → colonne passwordHash
```
ou en SQL : `SELECT email, "passwordHash" FROM "User";` → les valeurs commencent par `$2a$10$...` (jamais le mot de passe en clair).

### Prouver l'isolation entre deux comptes

Serveur lancé (`npm run dev`), dans un autre terminal :

```bash
cd backend
npm run demo:isolation                          # affiche les étapes ✅ / ❌
npm run demo:isolation > ../isolation-log.txt   # garde le log comme preuve
```

Le script crée l'utilisateur A et l'utilisateur B, vérifie que chacun ne voit que ses tâches, que B reçoit `404` en tentant de modifier ou supprimer une tâche de A, et que les requêtes sans token ou avec un faux token reçoivent `401`.
Des tests automatiques équivalents tournent sans base de données avec `npm test`.

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v3 |
| Backend | Express 4, TypeScript, ts-node, bcryptjs, jsonwebtoken |
| ORM | Prisma 6 |
| Base de données | PostgreSQL |

## Scripts

**Backend** (`cd backend`) : `npm run dev`, `npm run build`, `npm run db:migrate`, `npm run db:generate`, `npm run db:studio`, `npm test`, `npm run demo:isolation`

**Frontend** (`cd frontend`) : `npm run dev`, `npm run build`, `npm run lint`

## Tests API

Collection Postman : `postman/task-manager.postman_collection.json`. Lancez `Register` ou `Login` : le token est enregistré automatiquement dans la variable `token`, utilisée par les requêtes de tâches.

## Déploiement

- **Frontend** : Vercel/Netlify, dossier racine `frontend`, commande `npm run build`, sortie `dist`, variable `VITE_API_URL` = URL du backend.
- **Backend** : hébergeur Node (Render, Railway…), variables `DATABASE_URL` et `CORS_ORIGIN`.
