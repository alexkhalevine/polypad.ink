# Express Server

Backend for the polypad.ink 3D editor. Provides REST persistence, real-time multi-user collaboration over WebSockets, soft locks for concurrent edits, and an MCP integration path for AI agents.

## Features

- **REST API** for room and geometry CRUD (boxes, cylinders, spheres) with batch creation
- **Real-time collaboration** via Socket.IO — presence, cursors, selections, optimistic broadcasts
- **Soft object locks** with TTL + auto-sweep, so two users can't drag the same object at once
- **MCP-aware request gating** — bearer-authenticated traffic bypasses rate limits and lock checks
- **Per-room capacity caps** enforced inside a transaction (no TOCTOU races)
- **In-memory SQLite** (`sql.js`) with periodic snapshot to disk
- **Per-IP HTTP rate limiting** + per-socket WS rate limiting (separate buckets for cursor vs mutation)

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/rooms/:id` | Get (or autocreate) a room |
| `GET` | `/rooms/:id/objects` | List boxes, cylinders, spheres in the room |
| `POST` | `/rooms/:id/objects` | Place one object — returns `{ ok, id }` (server-assigned) |
| `POST` | `/rooms/:id/objects/batch` | Place many objects — returns `{ ok, inserted, ids }` |
| `PATCH` | `/rooms/:id/objects/:objectId` | Update color and/or center |
| `DELETE` | `/rooms/:id/objects/:objectId` | Remove an object |

Notes:
- IDs are generated server-side. Client-supplied `data.id` in request bodies is ignored.
- `PATCH` and `DELETE` are scoped by both `roomId` and `objectId` — cross-room access is rejected.
- `PATCH` and `DELETE` reject if the object is locked by another user (unless the caller is MCP).
- Identity is read from `x-polypad-user-id` (HTTP) or socket auth (WS).

## WebSocket API

Path: `/socket.io`. Clients connect with `auth: { userId, displayName, roomId }`.

### Server → client events

| Event | Payload | When |
|-------|---------|------|
| `room:state` | `{ users, locks, objects }` | Initial snapshot on connect |
| `room:full` | `{ max }` | Room at capacity (then disconnect) |
| `presence:joined` / `presence:left` | `{ userId, displayName? }` | User joins / leaves |
| `presence:cursor` | `{ userId, cursor }` | Other user moves their cursor |
| `presence:selection` | `{ userId, objectId }` | Other user changes selection |
| `object:created` / `updated` / `deleted` | `{ object \| objectId, by, ... }` | Geometry mutated (HTTP or WS) |
| `object:locked` | `{ objectId, userId, expiresAt }` | Object locked by a user |
| `object:unlocked` | `{ objectId }` | Lock released or swept on TTL expiry |

### Client → server events

| Event | Payload | Ack |
|-------|---------|-----|
| `presence:cursor` | `{ cursor }` | — |
| `presence:selection` | `{ objectId }` | — |
| `object:lock` | `{ objectId }` | `{ ok, lockedBy? }` |
| `object:unlock` | `{ objectId }` | `{ ok }` |

### Locking model

- Lock TTL: `LOCK_TTL_MS` (30s). A sweeper runs every `LOCK_SWEEP_MS` (5s) and emits `object:unlocked` when leases expire.
- A `PATCH` on a locked object refreshes the lease (touch on update).
- HTTP mutation endpoints reject (`409 locked`) if another user holds the lock; MCP requests bypass.

## Limits

| Setting | Value | Source |
|---------|-------|--------|
| Users per room | `5` | `MAX_USERS_PER_ROOM` |
| Geometry objects per room | `150` | `MAX_GEOMETRY_OBJECTS_PER_ROOM` |
| WS cursor msgs / sec / socket | `25` | `WS_CURSOR_PER_SEC` |
| WS mutation msgs / sec / socket | `20` | `WS_MUTATION_PER_SEC` |
| HTTP requests / window / IP | `100` per 15 min | `RATE_LIMIT_MAX` (env) |

The geometry cap is enforced inside `db.transaction(...)` so the count + insert is atomic.

## MCP integration

Set `MCP_BEARER_TOKEN`. Requests with `Authorization: Bearer <token>` are flagged `req.isMcp = true`, which:

- bypasses HTTP rate limiting,
- bypasses lock checks on `PATCH` / `DELETE`,
- attributes the actor as `"mcp"`.

The MCP server (`apps/mcp`) uses this to drive scene creation without browser-style throttling.

## Tech stack

- **Express 5** — HTTP server
- **Socket.IO 4** — WebSocket transport, room broadcast, ack callbacks
- **Drizzle ORM** + **sql.js** — in-memory SQLite, snapshotted to disk
- **express-rate-limit** — per-IP HTTP throttling

## Storage

`sql.js` runs SQLite fully in memory. The DB file at `DB_PATH` is loaded on startup if it exists, and re-written every 5s and on `SIGINT` / `SIGTERM`. Data between snapshot intervals is lost on a crash — fine for a dev/demo workload, not a transactional system of record.

## Development

```bash
pnpm install
pnpm --filter server dev
```

Server listens on port 4000.

## Production

```bash
pnpm --filter server build
pnpm --filter server start
```

Compiles TypeScript to `dist/` and runs `dist/index.js`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | HTTP port (Socket.IO shares this server) |
| `WEB_ORIGIN` | `http://localhost:3000` | CORS origin for both HTTP and WS |
| `DB_PATH` | `data/dev.sqlite` | SQLite snapshot path (relative to cwd) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | HTTP rate-limit window (15 min) |
| `RATE_LIMIT_MAX` | `100` | HTTP requests per window per IP |
| `MCP_BEARER_TOKEN` | _(unset)_ | Token granting MCP-tier access |

## Project layout

```
src/
  index.ts            # Express + Socket.IO bootstrap
  db.ts               # sql.js init + periodic snapshot
  schema.ts           # Drizzle schema
  constants.ts        # Caps and timeouts
  routes/             # HTTP handlers
  services/           # Domain logic (transactions, emits)
  realtime/           # Socket.IO setup, presence, locks, rate limits
  middleware/         # MCP detection + rate limiter
  types.ts            # Wire types shared with web/mcp
```
