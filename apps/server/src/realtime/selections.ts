// Per-room, lifetime-bound ownership of "which user has selected which object".
// Distinct from LockManager (which is TTL-leased and used only for active drags) —
// selection is held until the user changes selection, releases it, or disconnects.

export type SelectionSnapshot = Record<string, string>;

export class SelectionRegistry {
  private rooms = new Map<string, Map<string, string>>();

  private getRoom(roomId: string): Map<string, string> {
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
  ): { ok: true } | { ok: false; selectedBy: string } {
    const room = this.getRoom(roomId);
    const holder = room.get(objectId);
    if (holder && holder !== userId) {
      return { ok: false, selectedBy: holder };
    }
    room.set(objectId, userId);
    return { ok: true };
  }

  release(roomId: string, objectId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const holder = room.get(objectId);
    if (holder !== userId) return false;
    room.delete(objectId);
    return true;
  }

  currentFor(roomId: string, userId: string): string | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    for (const [objectId, holder] of room) {
      if (holder === userId) return objectId;
    }
    return null;
  }

  isSelectedByOther(
    roomId: string,
    objectId: string,
    userId: string,
  ): { selected: true; selectedBy: string } | { selected: false } {
    const room = this.rooms.get(roomId);
    if (!room) return { selected: false };
    const holder = room.get(objectId);
    if (!holder || holder === userId) return { selected: false };
    return { selected: true, selectedBy: holder };
  }

  releaseAllForUser(roomId: string, userId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const released: string[] = [];
    for (const [objectId, holder] of room) {
      if (holder === userId) {
        room.delete(objectId);
        released.push(objectId);
      }
    }
    return released;
  }

  snapshot(roomId: string): SelectionSnapshot {
    const room = this.rooms.get(roomId);
    if (!room) return {};
    return Object.fromEntries(room);
  }
}
