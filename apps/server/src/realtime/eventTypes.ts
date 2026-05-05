import type { WireObject, GetObjectsResponse } from "../types.js";

export type { WireObject, GetObjectsResponse };

export type Vec3 = { x: number; y: number; z: number };

export type LockSnapshot = Record<string, string>;

export interface RemoteUserPresence {
  userId: string;
  displayName: string;
  cursor: Vec3 | null;
  selectedObjectId: string | null;
}

// Server → client payloads

export interface RoomStatePayload {
  users: RemoteUserPresence[];
  locks: LockSnapshot;
  objects: GetObjectsResponse;
}

export interface RoomFullPayload {
  max: number;
}

export interface PresenceJoinedPayload {
  userId: string;
  displayName: string;
}

export interface PresenceLeftPayload {
  userId: string;
}

export interface PresenceCursorPayload {
  userId: string;
  cursor: Vec3 | null;
}

export interface PresenceSelectionPayload {
  userId: string;
  objectId: string | null;
}

export interface ObjectCreatedPayload {
  object: WireObject;
  by: string;
}

export interface ObjectUpdatedPayload {
  objectId: string;
  patch: { color?: string; center?: Vec3 };
  by: string;
}

export interface ObjectDeletedPayload {
  objectId: string;
  by: string;
}

export interface ObjectLockedPayload {
  objectId: string;
  userId: string;
  expiresAt: number;
}

export interface ObjectUnlockedPayload {
  objectId: string;
}

// Client → server payloads

export interface ClientCursorPayload {
  cursor: Vec3 | null;
}

export interface ClientSelectionPayload {
  objectId: string | null;
}

export interface ClientLockRequest {
  objectId: string;
}

export interface ClientLockAck {
  ok: boolean;
  lockedBy?: string;
}

export interface ClientUnlockAck {
  ok: true;
}

export interface ServerToClientEvents {
  "room:state": (payload: RoomStatePayload) => void;
  "room:full": (payload: RoomFullPayload) => void;
  "presence:joined": (payload: PresenceJoinedPayload) => void;
  "presence:left": (payload: PresenceLeftPayload) => void;
  "presence:cursor": (payload: PresenceCursorPayload) => void;
  "presence:selection": (payload: PresenceSelectionPayload) => void;
  "object:created": (payload: ObjectCreatedPayload) => void;
  "object:updated": (payload: ObjectUpdatedPayload) => void;
  "object:deleted": (payload: ObjectDeletedPayload) => void;
  "object:locked": (payload: ObjectLockedPayload) => void;
  "object:unlocked": (payload: ObjectUnlockedPayload) => void;
}

export interface ClientToServerEvents {
  "presence:cursor": (payload: ClientCursorPayload) => void;
  "presence:selection": (payload: ClientSelectionPayload) => void;
  "object:lock": (payload: ClientLockRequest, ack: (response: ClientLockAck) => void) => void;
  "object:unlock": (payload: ClientLockRequest, ack: (response: ClientUnlockAck) => void) => void;
}
