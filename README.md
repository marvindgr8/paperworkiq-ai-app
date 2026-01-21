# PaperworkIQ

PaperworkIQ is a calm, Apple-premium workspace for collecting documents, tracking extraction pipelines, and preparing structured data for future AI insights. This repository provides the initial monorepo scaffold with a React frontend and an Express + Prisma backend.

## Tech stack

- **Frontend:** Vite, React, TypeScript, Tailwind CSS, React Router, shadcn-inspired UI components
- **Backend:** Node.js (20+), Express, TypeScript, Prisma, MySQL, Zod, JWT auth scaffolding
- **Tooling:** pnpm workspaces, concurrently, Vitest

## Getting started

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure environment variables

Copy the root template and adjust values:

```bash
cp .env.example .env
```

Ensure you have a MySQL database available and update `DATABASE_URL` accordingly.

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
