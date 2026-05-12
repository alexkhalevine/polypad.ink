import { randomBytes, timingSafeEqual } from "node:crypto";

export function generateInviteCode(): string {
  return randomBytes(16).toString("base64url");
}

export function safeEqualCode(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
