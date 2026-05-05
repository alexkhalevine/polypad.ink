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
make dev
```

Open [http://localhost:3000](http://localhost:3000). 

This starts:
- **Web** at [http://localhost:3000](http://localhost:3000)
- **Server** at [http://localhost:4000](http://localhost:4000)

**Environment variables** (all optional — defaults shown):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server HTTP port |
| `WEB_ORIGIN` | `http://localhost:3000` | CORS allowed origin |
| `DB_PATH` | `data/dev.sqlite` | SQLite file path (relative to `apps/server/`) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP |
| `MCP_BEARER_TOKEN` | _(unset)_ | If set, requests with matching `Authorization: Bearer <token>` bypass rate limiting. Used by the MCP server. |

## Project structure

```
apps/
  web/     # Next.js frontend
  server/  # Express backend
  mcp/     # MCP server (lets Claude / other agents drive the room)
packages/
  shared/  # Shared types between web and server
```

## Running tests

```sh
pnpm --filter web test
```

## Using with Claude (MCP)

The `apps/mcp` package exposes the polypad room API as an [MCP](https://modelcontextprotocol.io/) server, so Claude Desktop, Claude Code, or other MCP-compatible agents can list, create, move, recolor, and delete shapes in a room.

### Build the MCP server

```sh
pnpm --filter mcp build
```

### Register with Claude

Copy [`mcp.example.json`](./mcp.example.json) into your MCP client config (e.g.
`~/.config/Claude/claude_desktop_config.json` for Claude Desktop, or your Claude Code
MCP settings) and replace `cwd` with the absolute path to this checkout. Restart the
client.

### Tools exposed

| Tool | Purpose |
|------|---------|
| `list_objects` | Read every shape in a room |
| `create_box` / `create_cylinder` / `create_sphere` | Place a single primitive |
| `create_objects` | Batch-place many primitives in one request |
| `move_object` | Update a shape's center |
| `set_object_color` | Update a shape's hex color |
| `delete_object` | Remove a shape |

Every tool accepts an optional `room_id`; if omitted, it falls back to `POLYPAD_DEFAULT_ROOM_ID`.

### MCP env vars

| Variable | Default | Description |
|----------|---------|-------------|
| `POLYPAD_API_URL` | `http://localhost:4000` | Polypad API base URL |
| `POLYPAD_DEFAULT_ROOM_ID` | _(unset)_ | Fallback room id when a tool call omits `room_id` |
| `POLYPAD_BEARER_TOKEN` | _(unset)_ | Sent as `Authorization: Bearer <token>` to bypass server rate limiting. Must match the server's `MCP_BEARER_TOKEN`. |

Recommended for active use: set the same random token in both `MCP_BEARER_TOKEN` (server) and `POLYPAD_BEARER_TOKEN` (MCP env) so AI traffic isn't lumped with browser IP rate limiting.

### Testing the MCP server

Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to drive tools interactively without a Claude client:

```sh
# Build first if you haven't already
pnpm --filter mcp build

# Launch the inspector (opens a local UI in your browser)
npx @modelcontextprotocol/inspector \
  node apps/mcp/dist/index.js \
  --env POLYPAD_API_URL=http://localhost:4000 \
  --env POLYPAD_DEFAULT_ROOM_ID=demo
```

The inspector lets you pick a tool, fill in arguments, and see the raw JSON-RPC response. Make sure `make dev` is running first so the server is up.

**Quick smoke test from the terminal** (no UI):

```sh
# Requires: server running (make dev), MCP built (pnpm --filter mcp build)
(
  printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}\n'
  sleep 0.2
  printf '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n'
  sleep 0.1
  printf '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_box","arguments":{"center":{"x":0,"y":0.5,"z":0},"width":1,"height":1,"depth":1,"color":"#ff0000"}}}\n'
  sleep 0.5
) | POLYPAD_DEFAULT_ROOM_ID=demo node apps/mcp/dist/index.js 2>/dev/null
```

Expected response for `create_box`: `{"ok":true,"id":"<uuid>","type":"box","room_id":"demo"}`.
Open `http://localhost:3000/room/demo` — the red box should appear within ~2 seconds.

## Few project details:

- nextjs for UI
- express for API server
- we use daisyUI for UI components