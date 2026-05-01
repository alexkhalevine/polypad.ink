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

### Web only (no server required)

The web app runs standalone with in-memory data — no backend setup needed:

```sh
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000).

### Full stack with Docker (web + server)

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

```sh
pnpm dev
```

This starts:
- **Web** at [http://localhost:3000](http://localhost:3000)
- **Server** at [http://localhost:4000](http://localhost:4000)

### Full stack without Docker (web + server)

Run the server and web app directly on your machine — no Docker required.

**1. Build the native SQLite addon** (once, after `pnpm install`):

```sh
cd node_modules/.pnpm/better-sqlite3@12.9.0/node_modules/better-sqlite3 && npm run build-release && cd -
```

This compiles `better-sqlite3` for your local Node.js version. Only needed once per machine; re-run if you upgrade Node.

**2. Start the server:**

```sh
pnpm --filter server dev
```

The server starts at [http://localhost:4000](http://localhost:4000) and creates a SQLite database at `apps/server/data/dev.sqlite` by default.

**2. Start the web app** (in a separate terminal):

```sh
pnpm dev:web
```

The web app opens at [http://localhost:3000](http://localhost:3000) and will connect to the server automatically.

**Environment variables** (all optional — defaults shown):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server HTTP port |
| `WEB_ORIGIN` | `http://localhost:3000` | CORS allowed origin |
| `DB_PATH` | `data/dev.sqlite` | SQLite file path (relative to `apps/server/`) |

To override, set them before the command or use a `.env` file in `apps/server/`:

```sh
PORT=4001 DB_PATH=data/local.sqlite pnpm --filter server dev
```

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

- we use daisyUI for UI components