# Express Server

Provides SQLite-backed persistence for the 3D editor in the polypad.ink web app.

## What it does

This server stores those 3d objects data in SQLite.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/rooms/:id` | Get room info (autocreates room if it doesn't exist) |
| GET | `/rooms/:id/objects` | List all objects in a room (boxes, cylinders, spheres) |
| POST | `/rooms/:id/objects` | Place a new object in a room |

## Tech stack

- **Express** — HTTP server
- **better-sqlite3** — SQLite driver with WAL mode and foreign keys

## Development

```bash
pnpm install
pnpm --filter server dev
```

Server runs on port 4000 by default.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | HTTP port |
| `WEB_ORIGIN` | `http://localhost:3000` | CORS origin |
| `DB_PATH` | `data/dev.sqlite` | Path to SQLite database (relative to cwd) |

## Production

```bash
pnpm --filter server build
pnpm --filter server start
```

Builds TypeScript to `dist/`, runs the compiled `dist/index.js`.