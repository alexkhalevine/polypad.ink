import { Router } from "express";
import { eq, asc, count } from "drizzle-orm";
import { db } from "../db.js";
import { geometryObjects, rooms } from "../schema.js";
import type { WireObject, GetObjectsResponse, WireBox, WireCylinder, WireSphere } from "../types.js";
import type { ObjectRow, NewObject } from "../schema.js";

const MAX_GEOMETRY_OBJECTS_PER_ROOM = 150;

const router = Router();

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

router.get("/:id/objects", async (req, res) => {
  const { id } = req.params;

  const rows = await db
    .select()
    .from(geometryObjects)
    .where(eq(geometryObjects.roomId, id))
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

  res.json(response);
});

router.post("/:id/objects", async (req, res) => {
  const { id } = req.params;
  const body = req.body as WireObject;

  if (!body.type || !body.data) {
    res.status(400).json({ error: "Invalid object format" });
    return;
  }

  // Ensure room exists before inserting geometry object
  await db.insert(rooms).values({ id, name: `Room ${id}` }).onConflictDoNothing().run();

  const currentCount = await db
    .select({ count: count() })
    .from(geometryObjects)
    .where(eq(geometryObjects.roomId, id))
    .get();

  if ((currentCount?.count ?? 0) >= MAX_GEOMETRY_OBJECTS_PER_ROOM) {
    res.status(400).json({
      error: `Room cannot have more than ${MAX_GEOMETRY_OBJECTS_PER_ROOM} geometry objects`,
    });
    return;
  }

  await db.insert(geometryObjects).values(wireToInsert(id, body)).run();

  res.status(201).json({ ok: true });
});

router.patch("/:id/objects/:objectId", async (req, res) => {
  const { objectId } = req.params;
  const body = req.body as { color?: string; center?: { x: number; y: number; z: number } };

  const existing = await db.select().from(geometryObjects).where(eq(geometryObjects.id, objectId)).get();

  if (!existing) {
    res.status(404).json({ error: "Object not found" });
    return;
  }

  const updates: Partial<ObjectRow> = {};

  if (body.color !== undefined) {
    // Validate hex color format (#RGB or #RRGGBB)
    const hexColorRegex = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/;
    if (typeof body.color !== "string" || !hexColorRegex.test(body.color)) {
      res.status(400).json({ error: "Invalid color format: must be a valid hex color (e.g., #fff or #ffffff)" });
      return;
    }
    updates.color = body.color;
  }

  if (body.center !== undefined) {
    updates.cx = body.center.x;
    updates.cy = body.center.y;
    updates.cz = body.center.z;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid update fields provided" });
    return;
  }

  await db.update(geometryObjects).set(updates).where(eq(geometryObjects.id, objectId)).run();

  res.json({ ok: true });
});

export default router;