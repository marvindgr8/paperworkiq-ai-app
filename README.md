# PaperworkIQ

PaperworkIQ is a calm, Apple-premium workspace for collecting documents, tracking extraction pipelines, and preparing structured data for future AI insights. This repository provides the initial monorepo scaffold with a React frontend and an Express + Prisma backend.

## Tech stack

- **Frontend:** Vite, React, TypeScript, Tailwind CSS, React Router, shadcn-inspired UI components
- **Backend:** Node.js (20.19+), Express, TypeScript, Prisma, MySQL, Zod, JWT auth scaffolding
- **Tooling:** pnpm workspaces, concurrently, Vitest

## Getting started

### 1) Install dependencies

This project expects **Node.js 20.19+** (or 22.12+) to run Vite 7 without runtime crypto errors.

```bash
pnpm install
```

### 2) Configure environment variables

Create a root `.env` file with the backend settings:

```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/paperworkiq"
JWT_SECRET="replace-with-a-long-random-string"
BACKEND_PORT=4000
FRONTEND_PORT=5173
```

The frontend can optionally set a `VITE_API_URL` (defaults to `http://localhost:4000` when unset).

### 3) Run database migrations

```bash
pnpm -C backend prisma:generate
pnpm -C backend prisma:migrate
```

### 4) Start the dev servers

```bash
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Frontend instructions

### Run the frontend only

```bash
pnpm -C frontend dev
```

### Configure API base URL (optional)

Create `frontend/.env.local` if you want to override the backend URL:

```bash
VITE_API_URL="http://localhost:4000"
```

## Backend instructions

### Run the backend only

```bash
pnpm -C backend dev
```

### Backend prerequisites

- MySQL database reachable via `DATABASE_URL`.
- Prisma client generated and migrations applied:

```bash
pnpm -C backend prisma:generate
pnpm -C backend prisma:migrate
```

## Useful scripts

- `pnpm dev` — run frontend + backend together
- `pnpm -C backend dev` — backend only
- `pnpm -C frontend dev` — frontend only
- `pnpm -C backend test` — backend smoke tests
- `pnpm -C backend prisma:studio` — Prisma Studio

## API endpoints (scaffold)

- `GET /api/health` — service health check
- `GET /api/db` — database connectivity check
- `POST /api/auth/register` — register user
- `POST /api/auth/login` — login user
- `GET /api/auth/me` — authenticated user
- `POST /api/docs` — create document (auth required)
- `GET /api/docs` — list documents (auth required)
- `GET /api/docs/:id` — fetch document (auth required)

## Next steps

- Add file uploads + storage (local/S3)
- OCR and AI extraction pipeline
- Field validation and review UI
- Search + semantic retrieval
- Chat with citations
