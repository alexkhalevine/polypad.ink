import type { ServerToClientEvents } from "./eventTypes.js";

export interface RoomEmitter {
  emit<E extends keyof ServerToClientEvents>(
    roomId: string,
    event: E,
    payload: Parameters<ServerToClientEvents[E]>[0],
  ): void;
}

export class NoopEmitter implements RoomEmitter {
  emit<E extends keyof ServerToClientEvents>(
    _roomId: string,
    _event: E,
    _payload: Parameters<ServerToClientEvents[E]>[0],
  ): void {
    // intentionally empty
  }
}
