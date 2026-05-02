# Polypad

A collaborative 3D drawing web app. Place and share geometric primitives (boxes, cylinders, spheres) in a shared room, persisted objects.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/installation) v10+

Install pnpm if you don't have it:

```sh
npm install -g pnpm
```

## Setup

Install dependencies from the repo root:

```sh
pnpm install
```

## Running locally

The web app runs with:

```sh
pnpm --filter web dev
```

Open [http://localhost:3000](http://localhost:3000). And start server with

```sh
pnpm --filter server dev
```

This starts:
- **Web** at [http://localhost:3000](http://localhost:3000)
- **Server** at [http://localhost:4000](http://localhost:4000)

**Environment variables** (all optional — defaults shown):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server HTTP port |
| `WEB_ORIGIN` | `http://localhost:3000` | CORS allowed origin |
| `DB_PATH` | `data/dev.sqlite` | SQLite file path (relative to `apps/server/`) |

## Project structure

```
apps/
  web/     # Next.js frontend
  server/  # Express + Socket.io backend
packages/
  shared/  # Shared types between web and server
```

## Running tests

```sh
pnpm --filter web test
```

## Few project details:

- nextjs for UI
- express for API server
- we use daisyUI for UI components