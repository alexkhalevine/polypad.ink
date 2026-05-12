import { NoopEmitter, type RoomEmitter } from "./emitter.js";
import { LockManager } from "./locks.js";
import { SelectionRegistry } from "./selections.js";
import { LOCK_TTL_MS } from "../constants.js";

let emitter: RoomEmitter = new NoopEmitter();
const lockManager = new LockManager({ ttlMs: LOCK_TTL_MS });
const selectionRegistry = new SelectionRegistry();

export function getEmitter(): RoomEmitter {
  return emitter;
}

export function getLockManager(): LockManager {
  return lockManager;
}

export function getSelectionRegistry(): SelectionRegistry {
  return selectionRegistry;
}

export function setEmitter(e: RoomEmitter): void {
  emitter = e;
}
