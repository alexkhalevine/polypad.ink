import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "./eventTypes.js";
import type { PresenceManager } from "./presence.js";
import type { LockManager } from "./locks.js";
import { SocketRateLimiter } from "./socketRateLimit.js";
import { listObjects } from "../services/roomService.js";
import { MAX_USERS_PER_ROOM, WS_CURSOR_PER_SEC, WS_MUTATION_PER_SEC } from "../constants.js";
import { recordJoinTiming } from "./metrics.js";

const DEBUG_RT = process.env.DEBUG_RT === "1";

export function registerHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  deps: { presence: PresenceManager; lockManager: LockManager },
): void {
  const { presence, lockManager } = deps;

  io.on("connection", async (socket) => {
    const t0 = performance.now();
    const auth = socket.handshake.auth as Record<string, unknown>;
    const userId = typeof auth.userId === "string" ? auth.userId : null;
    const displayName = typeof auth.displayName === "string" ? auth.displayName : null;
    const roomId = typeof auth.roomId === "string" ? auth.roomId : null;

    if (!userId || !displayName || !roomId) {
      socket.disconnect(true);
      return;
    }

    if (presence.count(roomId) >= MAX_USERS_PER_ROOM) {
      socket.emit("room:full", { max: MAX_USERS_PER_ROOM });
      socket.disconnect(true);
      return;
    }

    // Announce B to peers before doing any async work — peer A should see B's
    // avatar/cursor the moment the WS handshake completes, not after B's DB read.
    socket.join(roomId);
    presence.join(roomId, socket.id, { userId, displayName });
    socket.to(roomId).emit("presence:joined", { userId, displayName });
    const tJoined = performance.now();

    const objects = await listObjects(roomId);
    const tListed = performance.now();

    socket.emit("room:state", {
      users: presence.snapshot(roomId),
      locks: lockManager.snapshot(roomId),
      objects,
    });
    const tState = performance.now();

    const joinedMs = tJoined - t0;
    const listMs = tListed - tJoined;
    const stateMs = tState - tListed;
    const totalMs = tState - t0;
    recordJoinTiming(totalMs);
    if (DEBUG_RT) {
      console.log(
        `[rt] join roomId=${roomId} userId=${userId} joined=${joinedMs.toFixed(1)}ms list=${listMs.toFixed(1)}ms state=${stateMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms transport=${socket.conn.transport.name}`,
      );
    }

    const limiter = new SocketRateLimiter({ cursorPerSec: WS_CURSOR_PER_SEC, mutationPerSec: WS_MUTATION_PER_SEC });

    socket.on("presence:cursor", (payload) => {
      if (!limiter.tryCursor()) return;
      presence.setCursor(roomId, socket.id, payload.cursor);
      socket.to(roomId).emit("presence:cursor", { userId, cursor: payload.cursor });
    });

    socket.on("presence:selection", (payload) => {
      presence.setSelection(roomId, socket.id, payload.objectId);
      socket.to(roomId).emit("presence:selection", { userId, objectId: payload.objectId });
    });

    socket.on("object:lock", (payload, ack) => {
      if (!limiter.tryMutation()) {
        ack({ ok: false, lockedBy: "rate-limited" });
        return;
      }
      const result = lockManager.acquire(roomId, payload.objectId, userId);
      if (result.ok) {
        ack({ ok: true });
        io.to(roomId).emit("object:locked", { objectId: payload.objectId, userId, expiresAt: result.expiresAt });
      } else {
        ack({ ok: false, lockedBy: result.lockedBy });
      }
    });

    socket.on("object:unlock", (payload, ack) => {
      if (!limiter.tryMutation()) {
        ack({ ok: true });
        return;
      }
      const released = lockManager.release(roomId, payload.objectId, userId);
      ack({ ok: true });
      if (released) {
        io.to(roomId).emit("object:unlocked", { objectId: payload.objectId });
      }
    });

    socket.on("disconnect", () => {
      const releasedIds = lockManager.releaseAllForUser(roomId, userId);
      for (const objectId of releasedIds) {
        io.to(roomId).emit("object:unlocked", { objectId });
      }
      presence.leave(roomId, socket.id);
      io.to(roomId).emit("presence:left", { userId });
    });
  });
}
