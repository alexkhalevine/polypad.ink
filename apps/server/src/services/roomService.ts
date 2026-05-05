import { eq, asc, count } from "drizzle-orm";
import { db } from "../db.js";
import { geometryObjects, rooms } from "../schema.js";
import type { ObjectRow, NewObject } from "../schema.js";
import type { WireObject, GetObjectsResponse, WireBox, WireCylinder, WireSphere } from "../types.js";
import { MAX_GEOMETRY_OBJECTS_PER_ROOM } from "../constants.js";
import { getEmitter, getLockManager } from "../realtime/registry.js";

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

function wireToInsert(roomId: string, body: WireObject): NewObject {
  switch (body.type) {
    case "box": {
      const data = body.data as WireBox;
      return {
        id: data.id,
        roomId,
        type: "box",
        cx: data.cx,
        cy: data.cy,
        cz: data.cz,
        width: data.width,
        height: data.height,
        depth: data.depth,
        color: data.color ?? null,
      };
    }
    case "cylinder": {
      const data = body.data as WireCylinder;
      return {
        id: data.id,
        roomId,
        type: "cylinder",
        cx: data.cx,
        cy: data.cy,
        cz: data.cz,
        radius: data.radius,
        height: data.height,
        color: data.color ?? null,
      };
    }
    case "sphere": {
      const data = body.data as WireSphere;
      return {
        id: data.id,
        roomId,
        type: "sphere",
        cx: data.cx,
        cy: data.cy,
        cz: data.cz,
        radius: data.radius,
        color: data.color ?? null,
      };
    }
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
): Promise<{ ok: true } | { error: string; status: number }> {
  await db.insert(rooms).values({ id: roomId, name: `Room ${roomId}` }).onConflictDoNothing().run();

  const currentCount = await db
    .select({ count: count() })
    .from(geometryObjects)
    .where(eq(geometryObjects.roomId, roomId))
    .get();

  if ((currentCount?.count ?? 0) >= MAX_GEOMETRY_OBJECTS_PER_ROOM) {
    return {
      error: `Room cannot have more than ${MAX_GEOMETRY_OBJECTS_PER_ROOM} geometry objects`,
      status: 400,
    };
  }

  await db.insert(geometryObjects).values(wireToInsert(roomId, wire)).run();

  getEmitter().emit(roomId, "object:created", { object: wire, by: actor });

  return { ok: true };
}

export async function batchCreateObjects(
  roomId: string,
  wires: WireObject[],
  { actor }: { actor: string },
): Promise<{ ok: true; inserted: number } | { error: string; status: number }> {
  await db.insert(rooms).values({ id: roomId, name: `Room ${roomId}` }).onConflictDoNothing().run();

  const currentCount = await db
    .select({ count: count() })
    .from(geometryObjects)
    .where(eq(geometryObjects.roomId, roomId))
    .get();

  const existing = currentCount?.count ?? 0;
  if (existing + wires.length > MAX_GEOMETRY_OBJECTS_PER_ROOM) {
    return {
      error: `Room cannot have more than ${MAX_GEOMETRY_OBJECTS_PER_ROOM} geometry objects`,
      status: 400,
    };
  }

  const rows = wires.map((wire) => wireToInsert(roomId, wire));
  await db.insert(geometryObjects).values(rows).run();

  for (const wire of wires) {
    getEmitter().emit(roomId, "object:created", { object: wire, by: actor });
  }

  return { ok: true, inserted: rows.length };
}

export async function updateObject(
  roomId: string,
  objectId: string,
  patch: { color?: string; center?: { x: number; y: number; z: number } },
  { actor }: { actor: string },
): Promise<{ ok: true; existed: true } | { ok: false; existed: false } | { error: string; status: number }> {
  const existing = await db.select().from(geometryObjects).where(eq(geometryObjects.id, objectId)).get();

  if (!existing) {
    return { ok: false, existed: false };
  }

  const updates: Partial<ObjectRow> = {};
  const appliedPatch: { color?: string; center?: { x: number; y: number; z: number } } = {};

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

  if (Object.keys(updates).length === 0) {
    return { error: "No valid update fields provided", status: 400 };
  }

  await db.update(geometryObjects).set(updates).where(eq(geometryObjects.id, objectId)).run();

  getLockManager().touch(roomId, objectId, actor);
  getEmitter().emit(roomId, "object:updated", { objectId, patch: appliedPatch, by: actor });

  return { ok: true, existed: true };
}

export async function deleteObject(
  roomId: string,
  objectId: string,
  { actor }: { actor: string },
): Promise<{ ok: true } | { ok: false; existed: false } | { error: string; status: number }> {
  const existing = await db.select().from(geometryObjects).where(eq(geometryObjects.id, objectId)).get();

  if (!existing) {
    return { ok: false, existed: false };
  }

  await db.delete(geometryObjects).where(eq(geometryObjects.id, objectId)).run();

  getLockManager().release(roomId, objectId, actor);
  getEmitter().emit(roomId, "object:deleted", { objectId, by: actor });

  return { ok: true };
}
