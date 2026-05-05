import type { GetObjectsResponse, WireObject } from "./wire-types.js";

const API_URL = (process.env.POLYPAD_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const BEARER = process.env.POLYPAD_BEARER_TOKEN;

export class PolypadApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`Polypad API ${status}: ${body}`);
    this.name = "PolypadApiError";
  }
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { ...(extra ?? {}) };
  if (BEARER) h["Authorization"] = `Bearer ${BEARER}`;
  return h;
}

async function ensureOk(res: Response): Promise<void> {
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  throw new PolypadApiError(res.status, text || res.statusText);
}

export async function listObjects(roomId: string): Promise<GetObjectsResponse> {
  const res = await fetch(`${API_URL}/rooms/${encodeURIComponent(roomId)}/objects`, {
    headers: headers(),
  });
  await ensureOk(res);
  return (await res.json()) as GetObjectsResponse;
}

export async function createObject(roomId: string, object: WireObject): Promise<void> {
  const res = await fetch(`${API_URL}/rooms/${encodeURIComponent(roomId)}/objects`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(object),
  });
  await ensureOk(res);
}

export async function createObjectsBatch(
  roomId: string,
  objects: WireObject[]
): Promise<{ inserted: number }> {
  const res = await fetch(`${API_URL}/rooms/${encodeURIComponent(roomId)}/objects/batch`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ objects }),
  });
  await ensureOk(res);
  const body = (await res.json()) as { inserted?: number };
  return { inserted: body.inserted ?? objects.length };
}

export async function patchObject(
  roomId: string,
  objectId: string,
  patch: { color?: string; center?: { x: number; y: number; z: number } }
): Promise<void> {
  const res = await fetch(
    `${API_URL}/rooms/${encodeURIComponent(roomId)}/objects/${encodeURIComponent(objectId)}`,
    {
      method: "PATCH",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(patch),
    }
  );
  await ensureOk(res);
}

export async function deleteObject(roomId: string, objectId: string): Promise<void> {
  const res = await fetch(
    `${API_URL}/rooms/${encodeURIComponent(roomId)}/objects/${encodeURIComponent(objectId)}`,
    { method: "DELETE", headers: headers() }
  );
  await ensureOk(res);
}
