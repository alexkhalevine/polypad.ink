import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "./eventTypes.js";
import type { PresenceManager } from "./presence.js";
import type { LockManager } from "./locks.js";
import type { SelectionRegistry } from "./selections.js";
import { SocketRateLimiter } from "./socketRateLimit.js";
import { findRoomById, listObjects } from "../services/roomService.js";
import { safeEqualCode } from "../services/inviteCode.js";
import { MAX_USERS_PER_ROOM, WS_CURSOR_PER_SEC, WS_MUTATION_PER_SEC } from "../constants.js";
import { recordJoinTiming } from "./metrics.js";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("polypad-realtime");

const DEBUG_RT = process.env.DEBUG_RT === "1";

export function registerHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  deps: { presence: PresenceManager; lockManager: LockManager; selectionRegistry: SelectionRegistry },
): void {
  const { presence, lockManager, selectionRegistry } = deps;

  io.on("connection", async (socket) => {
    const t0 = performance.now();
    const auth = socket.handshake.auth as Record<string, unknown>;
    const userId = typeof auth.userId === "string" ? auth.userId : null;
    const displayName = typeof auth.displayName === "string" ? auth.displayName : null;
    const roomId = typeof auth.roomId === "string" ? auth.roomId : null;
    const inviteCode = typeof auth.inviteCode === "string" ? auth.inviteCode : null;

    if (!userId || !displayName || !roomId || !inviteCode) {
      socket.disconnect(true);
      return;
    }

    const room = findRoomById(roomId);
    if (!room || !safeEqualCode(inviteCode, room.inviteCode)) {
      socket.emit("room:denied", { reason: "invalid-invite" });
      socket.disconnect(true);
      return;
    }

    if (presence.count(roomId) >= MAX_USERS_PER_ROOM) {
      socket.emit("room:full", { max: MAX_USERS_PER_ROOM });
      socket.disconnect(true);
      return;
    }

    await tracer.startActiveSpan("socket.join", async (span) => {
      span.setAttributes({ "room.id": roomId, "user.id": userId, transport: socket.conn.transport.name });
      try {
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
        span.setAttributes({ "join.total_ms": totalMs, "join.list_ms": listMs, "join.state_ms": stateMs });
        if (DEBUG_RT) {
          console.log(
            `[rt] join roomId=${roomId} userId=${userId} joined=${joinedMs.toFixed(1)}ms list=${listMs.toFixed(1)}ms state=${stateMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms transport=${socket.conn.transport.name}`,
          );
        }
      } catch (e) {
        span.recordException(e as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw e;
      } finally {
        span.end();
      }
    });

    const limiter = new SocketRateLimiter({ cursorPerSec: WS_CURSOR_PER_SEC, mutationPerSec: WS_MUTATION_PER_SEC });

    socket.on("presence:cursor", (payload) => {
      if (!limiter.tryCursor()) return;
      presence.setCursor(roomId, socket.id, payload.cursor);
      socket.to(roomId).emit("presence:cursor", { userId, cursor: payload.cursor });
    });

    socket.on("presence:selection", (payload, ack) => {
      const prior = selectionRegistry.currentFor(roomId, userId);

      if (payload.objectId === null) {
        if (prior !== null) {
          selectionRegistry.release(roomId, prior, userId);
        }
        presence.setSelection(roomId, socket.id, null);
        socket.to(roomId).emit("presence:selection", { userId, objectId: null });
        ack({ ok: true });
        return;
      }

      if (prior === payload.objectId) {
        // No-op: user is re-asserting their existing selection.
        ack({ ok: true });
        return;
      }

      const result = selectionRegistry.acquire(roomId, payload.objectId, userId);
      if (!result.ok) {
        // Prior selection is preserved on failure — don't mutate anything.
        ack({ ok: false, selectedBy: result.selectedBy });
        return;
      }

      if (prior !== null) {
        selectionRegistry.release(roomId, prior, userId);
      }

      presence.setSelection(roomId, socket.id, payload.objectId);
      // Single broadcast: peers infer that the user's prior selection is gone
      // because each user has at most one selection at a time.
      socket.to(roomId).emit("presence:selection", { userId, objectId: payload.objectId });
      ack({ ok: true });
    });

    socket.on("object:lock", (payload, ack) => {
      tracer.startActiveSpan("socket.object.lock", (span) => {
        span.setAttributes({ "room.id": roomId, "object.id": payload.objectId, "user.id": userId });
        try {
          if (!limiter.tryMutation()) {
            span.setAttributes({ "lock.acquired": false, "lock.denied_reason": "rate-limited" });
            ack({ ok: false, lockedBy: "rate-limited" });
            return;
          }
          const result = lockManager.acquire(roomId, payload.objectId, userId);
          span.setAttributes({ "lock.acquired": result.ok });
          if (result.ok) {
            ack({ ok: true });
            io.to(roomId).emit("object:locked", { objectId: payload.objectId, userId, expiresAt: result.expiresAt });
          } else {
            ack({ ok: false, lockedBy: result.lockedBy });
          }
        } catch (e) {
          span.recordException(e as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw e;
        } finally {
          span.end();
        }
      });
    });

    socket.on("object:unlock", (payload, ack) => {
      tracer.startActiveSpan("socket.object.unlock", (span) => {
        span.setAttributes({ "room.id": roomId, "object.id": payload.objectId, "user.id": userId });
        try {
          if (!limiter.tryMutation()) {
            ack({ ok: true });
            return;
          }
          const released = lockManager.release(roomId, payload.objectId, userId);
          span.setAttributes({ "lock.released": released });
          ack({ ok: true });
          if (released) {
            io.to(roomId).emit("object:unlocked", { objectId: payload.objectId });
          }
        } catch (e) {
          span.recordException(e as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw e;
        } finally {
          span.end();
        }
      });
    });

    socket.on("disconnect", () => {
      const releasedIds = lockManager.releaseAllForUser(roomId, userId);
      for (const objectId of releasedIds) {
        io.to(roomId).emit("object:unlocked", { objectId });
      }
      selectionRegistry.releaseAllForUser(roomId, userId);
      presence.leave(roomId, socket.id);
      io.to(roomId).emit("presence:left", { userId });
    });
  });
}
