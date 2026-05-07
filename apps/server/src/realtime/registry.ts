import { NoopEmitter, type RoomEmitter } from "./emitter.js";
import { LockManager } from "./locks.js";
import { LOCK_TTL_MS } from "../constants.js";

let emitter: RoomEmitter = new NoopEmitter();
const lockManager = new LockManager({ ttlMs: LOCK_TTL_MS });

export function getEmitter(): RoomEmitter {
  return emitter;
}

export function getLockManager(): LockManager {
  return lockManager;
}

export function setEmitter(e: RoomEmitter): void {
  emitter = e;
}
