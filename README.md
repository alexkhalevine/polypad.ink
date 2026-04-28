# Polypad

Polypad is simple 3d drawing web app using websockets for collaborative design

## Development

- install pnpm, if not yet done: https://pnpm.io/installation
- install packages with:
```
# add dep to a specific package
pnpm --filter server add express socket.io better-sqlite3
pnpm --filter web add three @react-three/fiber socket.io-client

# add dev dep
pnpm --filter server add -D tsx typescript @types/node

```
- start UI only with `pnpm dev:web`
- start server with `dev:server`