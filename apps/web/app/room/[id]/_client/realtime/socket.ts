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

// Start on websocket only — skips the HTTP long-polling handshake (saves ~2–5s on slow networks
// and avoids polling-then-upgrade buffering). If the first connect attempt fails (e.g. a proxy
// strips WS upgrade), flip the manager's transports to include polling and let it retry — this
// reuses all already-registered event listeners on the Socket.
export function createRoomSocket(
  roomId: string,
  userId: string,
  displayName: string,
  inviteCode: string,
): RoomSocket {
  const socket: RoomSocket = io(API_BASE, {
    auth: { userId, displayName, roomId, inviteCode },
    path: "/socket.io",
    transports: ["websocket"],
    upgrade: false,
    autoConnect: true,
  });

  let fallbackUsed = false;
  socket.on("connect_error", () => {
    if (fallbackUsed || socket.connected) return;
    fallbackUsed = true;
    // Manager's transport list controls future reconnect attempts.
    socket.io.opts.transports = ["websocket", "polling"];
  });

  return socket;
}
