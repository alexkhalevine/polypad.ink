import { io, Socket } from "socket.io-client";
import { API_BASE } from "../queries/api-base";
import type { ClientToServerEvents, ServerToClientEvents } from "./event-types";

const USER_ID_KEY = "polypad.userId";
const DISPLAY_NAME_KEY = "polypad.displayName";

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function getDisplayName(): string {
  if (typeof window === "undefined") return "anon";
  let name = localStorage.getItem(DISPLAY_NAME_KEY);
  if (!name) {
    name = `User-${Math.floor(Math.random() * 9000 + 1000)}`;
    localStorage.setItem(DISPLAY_NAME_KEY, name);
  }
  return name;
}

export function setDisplayName(name: string): void {
  if (typeof window !== "undefined") localStorage.setItem(DISPLAY_NAME_KEY, name);
}

export type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createRoomSocket(roomId: string, userId: string, displayName: string): RoomSocket {
  return io(API_BASE, {
    auth: { userId, displayName, roomId },
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
}
