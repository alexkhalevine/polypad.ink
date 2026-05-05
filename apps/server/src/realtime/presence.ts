import type { Vec3, RemoteUserPresence } from "./eventTypes.js";

interface PresenceEntry {
  userId: string;
  displayName: string;
  cursor: Vec3 | null;
  selectedObjectId: string | null;
}

export class PresenceManager {
  private rooms = new Map<string, Map<string, PresenceEntry>>();

  private getRoom(roomId: string): Map<string, PresenceEntry> {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Map();
      this.rooms.set(roomId, room);
    }
    return room;
  }

  join(roomId: string, socketId: string, { userId, displayName }: { userId: string; displayName: string }): void {
    this.getRoom(roomId).set(socketId, { userId, displayName, cursor: null, selectedObjectId: null });
  }

  leave(roomId: string, socketId: string): { userId: string; displayName: string } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const entry = room.get(socketId);
    if (!entry) return null;
    room.delete(socketId);
    if (room.size === 0) {
      this.rooms.delete(roomId);
    }
    return { userId: entry.userId, displayName: entry.displayName };
  }

  setCursor(roomId: string, socketId: string, cursor: Vec3 | null): { userId: string } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const entry = room.get(socketId);
    if (!entry) return null;
    entry.cursor = cursor;
    return { userId: entry.userId };
  }

  setSelection(roomId: string, socketId: string, objectId: string | null): { userId: string } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const entry = room.get(socketId);
    if (!entry) return null;
    entry.selectedObjectId = objectId;
    return { userId: entry.userId };
  }

  count(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  snapshot(roomId: string): RemoteUserPresence[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.values()).map((e) => ({
      userId: e.userId,
      displayName: e.displayName,
      cursor: e.cursor,
      selectedObjectId: e.selectedObjectId,
    }));
  }
}
