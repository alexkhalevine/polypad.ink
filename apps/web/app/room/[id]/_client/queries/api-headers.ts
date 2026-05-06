import { getOrCreateUserId } from "../realtime/socket";

export function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-polypad-user-id": getOrCreateUserId(),
  };
}
