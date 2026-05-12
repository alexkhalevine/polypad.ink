import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "./eventTypes.js";
import type { RoomEmitter } from "./emitter.js";
import { setEmitter, getLockManager, getSelectionRegistry } from "./registry.js";
import type { LockManager } from "./locks.js";
import { PresenceManager } from "./presence.js";
import { registerHandlers } from "./handlers.js";
import { LOCK_SWEEP_MS } from "../constants.js";

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

export function initRealtime(httpServer: HttpServer): {
  emitter: RoomEmitter;
  lockManager: LockManager;
  stop: () => void;
} {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: WEB_ORIGIN, credentials: true },
    path: "/socket.io",
    // Keep both transports so clients behind hostile proxies can still connect.
    // The client requests websocket-only by default; this list only matters as a fallback.
    transports: ["websocket", "polling"],
    pingInterval: 10_000,
    pingTimeout: 20_000,
    // Cursor frames are tiny and frequent; per-message compression hurts more than it helps.
    perMessageDeflate: false,
  });

  const emitter: RoomEmitter = {
    emit: (roomId, event, payload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (io.to(roomId) as any).emit(event, payload);
    },
  };

  setEmitter(emitter);

  const presence = new PresenceManager();
  const lockManager = getLockManager();
  const selectionRegistry = getSelectionRegistry();

  registerHandlers(io, { presence, lockManager, selectionRegistry });

  const sweepTimer = setInterval(() => {
    const swept = lockManager.sweep();
    for (const { roomId, objectId } of swept) {
      emitter.emit(roomId, "object:unlocked", { objectId });
    }
  }, LOCK_SWEEP_MS);

  const stop = () => {
    clearInterval(sweepTimer);
    io.close();
  };

  return { emitter, lockManager, stop };
}
