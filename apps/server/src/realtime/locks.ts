import type { LockSnapshot } from "./eventTypes.js";

interface LockEntry {
  userId: string;
  expiresAt: number;
}

export class LockManager {
  private rooms = new Map<string, Map<string, LockEntry>>();
  private ttlMs: number;

  constructor({ ttlMs }: { ttlMs: number }) {
    this.ttlMs = ttlMs;
  }

  private getRoom(roomId: string): Map<string, LockEntry> {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Map();
      this.rooms.set(roomId, room);
    }
    return room;
  }

  acquire(
    roomId: string,
    objectId: string,
    userId: string,
  ): { ok: true; expiresAt: number } | { ok: false; lockedBy: string } {
    const room = this.getRoom(roomId);
    const entry = room.get(objectId);
    const now = Date.now();

    if (entry && entry.userId !== userId && entry.expiresAt >= now) {
      return { ok: false, lockedBy: entry.userId };
    }

    const expiresAt = now + this.ttlMs;
    room.set(objectId, { userId, expiresAt });
    return { ok: true, expiresAt };
  }

  release(roomId: string, objectId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const entry = room.get(objectId);
    if (!entry || entry.userId !== userId) return false;
    room.delete(objectId);
    return true;
  }

  touch(roomId: string, objectId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const entry = room.get(objectId);
    const now = Date.now();
    if (!entry || entry.userId !== userId || entry.expiresAt < now) return false;
    entry.expiresAt = now + this.ttlMs;
    return true;
  }

  isLockedByOther(
    roomId: string,
    objectId: string,
    userId: string,
  ): { locked: true; lockedBy: string } | { locked: false } {
    const room = this.rooms.get(roomId);
    if (!room) return { locked: false };
    const entry = room.get(objectId);
    if (!entry) return { locked: false };
    if (entry.expiresAt < Date.now()) {
      room.delete(objectId);
      return { locked: false };
    }
    if (entry.userId === userId) return { locked: false };
    return { locked: true, lockedBy: entry.userId };
  }

  releaseAllForUser(roomId: string, userId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const released: string[] = [];
    for (const [objectId, entry] of room) {
      if (entry.userId === userId) {
        room.delete(objectId);
        released.push(objectId);
      }
    }
    return released;
  }

  sweep(): { roomId: string; objectId: string }[] {
    const now = Date.now();
    const swept: { roomId: string; objectId: string }[] = [];
    for (const [roomId, room] of this.rooms) {
      for (const [objectId, entry] of room) {
        if (entry.expiresAt < now) {
          room.delete(objectId);
          swept.push({ roomId, objectId });
        }
      }
    }
    return swept;
  }

  snapshot(roomId: string): LockSnapshot {
    const room = this.rooms.get(roomId);
    if (!room) return {};
    const now = Date.now();
    const result: LockSnapshot = {};
    for (const [objectId, entry] of room) {
      if (entry.expiresAt >= now) {
        result[objectId] = entry.userId;
      }
    }
    return result;
  }
}
