# Polypad

A collaborative 3D drawing web app. Place and share geometric primitives (boxes, cylinders, spheres) in a shared room, persisted objects.

<img width="2994" height="1692" alt="Screenshot 2026-05-23 at 20 42 18" src="https://github.com/user-attachments/assets/8d4b9259-7673-4ecd-91dc-8c34c2ae3b80" />


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
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API base URL used by the web app (must be set at Next.js build time) |

## Project structure

```
apps/
  web/     # Next.js frontend
  server/  # Express backend
  mcp/     # MCP server (lets Claude / other agents drive the room)
```

## API documentation

The server exposes an interactive API reference via Swagger UI:

```
http://localhost:4000/api-docs
```

The raw OpenAPI 3.1 spec (JSON) is available at:

```
http://localhost:4000/openapi.json
```

The spec is also committed to the repo at [`apps/server/openapi.json`](apps/server/openapi.json) so the web build doesn't need the server running.

### Regenerating the spec and client after API changes

When you change request/response shapes in `apps/server/src/openapi/schemas.ts` or add routes in `apps/server/src/openapi/spec.ts`, regenerate and commit both artifacts:

```sh
pnpm --filter server generate:spec   # rewrites apps/server/openapi.json
pnpm --filter web generate:api       # rewrites apps/web/src/api/generated/
```

### How the typed client works

The web app imports from `apps/web/src/api/generated/` — never write to these files by hand. The generation pipeline is:

```
Zod schemas (schemas.ts)
  → OpenAPI spec (openapi.json)   via @asteasolutions/zod-to-openapi
  → TypeScript client             via orval
```

All Zod schemas live in `apps/server/src/openapi/schemas.ts` and are the single source of truth for both server-side runtime validation and the OpenAPI spec.

## Running tests

Unit tests (Vitest):

```sh
pnpm --filter web test
```

### E2E tests (Playwright)

E2E tests live in `apps/web/e2e/` and cover the room creation flow and 3D editor basics.

**First-time setup** — install the Chromium browser binary:

```sh
pnpm --filter web exec playwright install chromium
```

Run all E2E tests (automatically starts web + server, no need to run `make dev` separately):

```sh
pnpm --filter web test:e2e
```

Open the Playwright UI for interactive debugging and trace inspection:

```sh
pnpm --filter web test:e2e:ui
```

Run headed (watch the browser):

```sh
pnpm --filter web test:e2e:headed
```

The `webServer` config in `apps/web/playwright.config.ts` starts both the Next.js app (port 3000) and the Express server (port 4000) before tests run and tears them down after. On repeated local runs it reuses already-running servers automatically.

## Using with Claude (MCP)

The `apps/mcp` package exposes the polypad room API as an [MCP](https://modelcontextprotocol.io/) server, so Claude Desktop, Claude Code, or other MCP-compatible agents can list, create, move, recolor, and delete shapes in a room.

### Build the MCP server

```sh
pnpm --filter mcp build
```

### Register with Claude

Add the `polypad` entry below to your MCP client's config under `mcpServers`. The exact
config file depends on the client:

- **Claude Desktop** — `~/.config/Claude/claude_desktop_config.json`
- **Claude Code** — your project or user `.claude.json` (or run `claude mcp add`)

The `cwd` value must be the absolute path to this checkout — run `pwd` from the repo
root and paste the result. (See [`mcp.example.json`](./mcp.example.json) for the same
snippet as a standalone file.)

```jsonc
{
  "mcpServers": {
    "polypad": {
      "command": "pnpm",
      "args": ["--filter", "mcp", "start"],
      "cwd": "/absolute/path/to/polypad.ink",   // ← replace with the output of `pwd`
      "env": {
        "POLYPAD_API_URL": "http://localhost:4000",
        "POLYPAD_DEFAULT_ROOM_ID": "demo"
      }
    }
  }
}
```

If your config already has other `mcpServers` entries, add `polypad` alongside them
rather than overwriting the file. Restart the client after saving.

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

## Agent-driven browser verification (Claude Code + Playwright CLI)

When working in this repo, Claude Code can open a live browser, navigate the app, and verify features by itself — separately from the automated E2E test suite.

This is powered by two things that are already configured in the repo:

- **`.claude/settings.json`** — enables the Playwright MCP server for this project, giving Claude browser tools (`browser_navigate`, `browser_click`, `browser_screenshot`, etc.)
- **`playwright-cli` skill** — a richer interactive CLI that Claude can use to drive a browser, inspect page snapshots, intercept network requests, record traces, and more

### Install playwright-cli (one-time, per machine)

```sh
npm install -g @playwright/cli
playwright-cli install --skills
```

The `--skills` step installs structured reference docs that teach Claude how to use `playwright-cli` effectively. After running it, **restart Claude Code** to pick up the new skill.

Verify the CLI is available:

```sh
playwright-cli --version
```

### How it works

Once installed, Claude can:

```
playwright-cli open http://localhost:3000   # open a browser
playwright-cli snapshot                    # inspect the page (no screenshot needed)
playwright-cli click e5                    # interact via element refs from the snapshot
playwright-cli cookie-set hcaptcha_token test  # set cookies to bypass gates
playwright-cli requests                    # inspect network calls
playwright-cli close
```

You can ask Claude things like _"open the app and verify the box draw tool works"_ and it will drive the browser, make observations, and report back — without running the full test suite.

The automated `test:e2e` suite and the agent-driven `playwright-cli` session are complementary: the test suite is for CI and regression coverage, the CLI session is for exploratory verification during development.

## Few project details:

- Next.js for UI
- Express for API server
- DaisyUI for UI components
- Zod + `@asteasolutions/zod-to-openapi` for API schema and OpenAPI spec generation
- orval for generating the typed TypeScript client in the web app
