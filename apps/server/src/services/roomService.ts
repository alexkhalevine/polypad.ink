import { eq, and, asc, count } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, markDirty } from "../db.js";
import { geometryObjects, rooms } from "../schema.js";
import type { ObjectRow, NewObject } from "../schema.js";
import type { WireObject, GetObjectsResponse } from "../types.js";
import { MAX_GEOMETRY_OBJECTS_PER_ROOM } from "../constants.js";
import { getEmitter, getLockManager } from "../realtime/registry.js";
import { generateInviteCode } from "./inviteCode.js";

export type CreateRoomResult =
  | { ok: true; id: string; inviteCode: string }
  | { error: "conflict"; status: 409 }
  | { error: "invalid-name"; status: 400 };

export function createRoom(name: string): CreateRoomResult {
  const trimmed = name.trim();
  if (!trimmed) return { error: "invalid-name", status: 400 };

  const id = trimmed;
  const inviteCode = generateInviteCode();

  const result = db.transaction((tx): CreateRoomResult => {
    const existing = tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, id)).get();
    if (existing) return { error: "conflict", status: 409 };
    tx.insert(rooms).values({ id, name: trimmed, inviteCode }).run();
    return { ok: true, id, inviteCode };
  });

  if ("ok" in result) markDirty();
  return result;
}

export function findRoomById(id: string): { id: string; name: string; inviteCode: string } | null {
  const row = db
    .select({ id: rooms.id, name: rooms.name, inviteCode: rooms.inviteCode })
    .from(rooms)
    .where(eq(rooms.id, id))
    .get();
  return row ?? null;
}

function rowToWire(row: ObjectRow): WireObject {
  switch (row.type) {
    case "box":
      return {
        type: "box",
        data: {
          id: row.id,
          cx: row.cx,
          cy: row.cy,
          cz: row.cz,
          width: row.width ?? 1,
          height: row.height ?? 1,
          depth: row.depth ?? 1,
          color: row.color ?? null,
        },
      };
    case "cylinder":
      return {
        type: "cylinder",
        data: {
          id: row.id,
          cx: row.cx,
          cy: row.cy,
          cz: row.cz,
          radius: row.radius ?? 0.5,
          height: row.height ?? 1,
          color: row.color ?? null,
        },
      };
    case "sphere":
      return {
        type: "sphere",
        data: {
          id: row.id,
          cx: row.cx,
          cy: row.cy,
          cz: row.cz,
          radius: row.radius ?? 0.5,
          color: row.color ?? null,
        },
      };
  }
}

function wireToInsert(roomId: string, wire: WireObject): NewObject {
  switch (wire.type) {
    case "box": {
      const d = wire.data;
      return {
        id: d.id,
        roomId,
        type: "box",
        cx: d.cx,
        cy: d.cy,
        cz: d.cz,
        width: d.width,
        height: d.height,
        depth: d.depth,
        color: d.color ?? null,
      };
    }
    case "cylinder": {
      const d = wire.data;
      return {
        id: d.id,
        roomId,
        type: "cylinder",
        cx: d.cx,
        cy: d.cy,
        cz: d.cz,
        radius: d.radius,
        height: d.height,
        color: d.color ?? null,
      };
    }
    case "sphere": {
      const d = wire.data;
      return {
        id: d.id,
        roomId,
        type: "sphere",
        cx: d.cx,
        cy: d.cy,
        cz: d.cz,
        radius: d.radius,
        color: d.color ?? null,
      };
    }
  }
}

// Returns a wire object with the server-assigned id substituted in.
// IDs from the request body are ignored to prevent client-controlled primary keys.
function withServerId(wire: WireObject, id: string): WireObject {
  switch (wire.type) {
    case "box":
      return { type: "box", data: { ...wire.data, id } };
    case "cylinder":
      return { type: "cylinder", data: { ...wire.data, id } };
    case "sphere":
      return { type: "sphere", data: { ...wire.data, id } };
  }
}

export async function listObjects(roomId: string): Promise<GetObjectsResponse> {
  const rows = await db
    .select()
    .from(geometryObjects)
    .where(eq(geometryObjects.roomId, roomId))
    .orderBy(asc(geometryObjects.createdAt))
    .all();

  const response: GetObjectsResponse = {
    boxes: [],
    cylinders: [],
    spheres: [],
  };

  for (const row of rows) {
    const wire = rowToWire(row);
    switch (wire.type) {
      case "box":
        response.boxes.push(wire.data);
        break;
      case "cylinder":
        response.cylinders.push(wire.data);
        break;
      case "sphere":
        response.spheres.push(wire.data);
        break;
    }
  }

  return response;
}

export async function createObject(
  roomId: string,
  wire: WireObject,
  { actor }: { actor: string },
): Promise<{ ok: true; id: string } | { error: string; status: number }> {
  const id = randomUUID();
  const serverWire = withServerId(wire, id);

  type TxResult = { ok: true } | { error: string; status: number };
  const result: TxResult = db.transaction((tx): TxResult => {
    const current = tx
      .select({ count: count() })
      .from(geometryObjects)
      .where(eq(geometryObjects.roomId, roomId))
      .get();

    if ((current?.count ?? 0) >= MAX_GEOMETRY_OBJECTS_PER_ROOM) {
      return {
        error: `Room cannot have more than ${MAX_GEOMETRY_OBJECTS_PER_ROOM} geometry objects`,
        status: 400,
      };
    }

    tx.insert(geometryObjects).values(wireToInsert(roomId, serverWire)).run();
    return { ok: true };
  });

  if ("error" in result) return result;

  markDirty();
  getEmitter().emit(roomId, "object:created", { object: serverWire, by: actor });
  return { ok: true, id };
}

export async function batchCreateObjects(
  roomId: string,
  wires: WireObject[],
  { actor }: { actor: string },
): Promise<{ ok: true; inserted: number; ids: string[] } | { error: string; status: number }> {
  const ids = wires.map(() => randomUUID());
  const serverWires = wires.map((w, i) => withServerId(w, ids[i]!));

  type TxResult = { ok: true } | { error: string; status: number };
  const result: TxResult = db.transaction((tx): TxResult => {
    const current = tx
      .select({ count: count() })
      .from(geometryObjects)
      .where(eq(geometryObjects.roomId, roomId))
      .get();

    const existing = current?.count ?? 0;
    if (existing + serverWires.length > MAX_GEOMETRY_OBJECTS_PER_ROOM) {
      return {
        error: `Room cannot have more than ${MAX_GEOMETRY_OBJECTS_PER_ROOM} geometry objects`,
        status: 400,
      };
    }

    const rows = serverWires.map((w) => wireToInsert(roomId, w));
    tx.insert(geometryObjects).values(rows).run();
    return { ok: true };
  });

  if ("error" in result) return result;

  markDirty();
  for (const w of serverWires) {
    getEmitter().emit(roomId, "object:created", { object: w, by: actor });
  }

  return { ok: true, inserted: serverWires.length, ids };
}

type DimensionField = "width" | "height" | "depth" | "radius";

const ALLOWED_DIMENSIONS: Record<ObjectRow["type"], DimensionField[]> = {
  box: ["width", "height", "depth"],
  cylinder: ["radius", "height"],
  sphere: ["radius"],
};

export interface UpdatePatch {
  color?: string;
  center?: { x: number; y: number; z: number };
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
}

export async function updateObject(
  roomId: string,
  objectId: string,
  patch: UpdatePatch,
  { actor }: { actor: string },
): Promise<{ ok: true; existed: true } | { ok: false; existed: false } | { error: string; status: number }> {
  const where = and(eq(geometryObjects.roomId, roomId), eq(geometryObjects.id, objectId));
  const existing = await db.select().from(geometryObjects).where(where).get();

  if (!existing) {
    return { ok: false, existed: false };
  }

  const updates: Partial<ObjectRow> = {};
  const appliedPatch: UpdatePatch = {};

  if (patch.color !== undefined) {
    const hexColorRegex = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/;
    if (typeof patch.color !== "string" || !hexColorRegex.test(patch.color)) {
      return {
        error: "Invalid color format: must be a valid hex color (e.g., #fff or #ffffff)",
        status: 400,
      };
    }
    updates.color = patch.color;
    appliedPatch.color = patch.color;
  }

  if (patch.center !== undefined) {
    updates.cx = patch.center.x;
    updates.cy = patch.center.y;
    updates.cz = patch.center.z;
    appliedPatch.center = patch.center;
  }

  const allowed = ALLOWED_DIMENSIONS[existing.type];
  for (const field of ["width", "height", "depth", "radius"] as const) {
    const value = patch[field];
    if (value === undefined) continue;
    if (!allowed.includes(field)) {
      return { error: `field '${field}' is not valid for type '${existing.type}'`, status: 400 };
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return { error: `field '${field}' must be a positive finite number`, status: 400 };
    }
    updates[field] = value;
    appliedPatch[field] = value;
  }

  if (Object.keys(updates).length === 0) {
    return { error: "No valid update fields provided", status: 400 };
  }

  await db.update(geometryObjects).set(updates).where(where).run();

  markDirty();
  getLockManager().touch(roomId, objectId, actor);
  getEmitter().emit(roomId, "object:updated", { objectId, patch: appliedPatch, by: actor });

  return { ok: true, existed: true };
}

export async function deleteObject(
  roomId: string,
  objectId: string,
  { actor }: { actor: string },
): Promise<{ ok: true } | { ok: false; existed: false } | { error: string; status: number }> {
  const where = and(eq(geometryObjects.roomId, roomId), eq(geometryObjects.id, objectId));
  const existing = await db.select().from(geometryObjects).where(where).get();

  if (!existing) {
    return { ok: false, existed: false };
  }

  await db.delete(geometryObjects).where(where).run();

  markDirty();
  getLockManager().release(roomId, objectId, actor);
  getEmitter().emit(roomId, "object:deleted", { objectId, by: actor });

  return { ok: true };
}
