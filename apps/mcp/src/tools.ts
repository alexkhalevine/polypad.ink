import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createObject,
  createObjectsBatch,
  deleteObject,
  listObjects,
  patchObject,
  PolypadApiError,
} from "./api-client.js";
import type { WireObject } from "./wire-types.js";

const HEX_COLOR = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/;

const VectorSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

const ColorSchema = z
  .string()
  .regex(HEX_COLOR, "color must be a hex string like #f00 or #ff0000")
  .optional();

function resolveRoomId(provided: string | undefined): string {
  const fallback = process.env.POLYPAD_DEFAULT_ROOM_ID;
  const id = provided ?? fallback;
  if (!id || id.trim() === "") {
    throw new Error("room_id is required (or set POLYPAD_DEFAULT_ROOM_ID)");
  }
  return id;
}

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function fail(err: unknown) {
  const text =
    err instanceof PolypadApiError
      ? `Polypad API error ${err.status}: ${err.body}`
      : err instanceof Error
        ? err.message
        : String(err);
  return { isError: true, content: [{ type: "text" as const, text }] };
}

const BoxBody = z.object({
  room_id: z.string().optional(),
  center: VectorSchema,
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive(),
  color: ColorSchema,
});

const CylinderBody = z.object({
  room_id: z.string().optional(),
  center: VectorSchema,
  radius: z.number().positive(),
  height: z.number().positive(),
  color: ColorSchema,
});

const SphereBody = z.object({
  room_id: z.string().optional(),
  center: VectorSchema,
  radius: z.number().positive(),
  color: ColorSchema,
});

const BatchObjectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("box"), data: BoxBody.omit({ room_id: true }) }),
  z.object({ type: z.literal("cylinder"), data: CylinderBody.omit({ room_id: true }) }),
  z.object({ type: z.literal("sphere"), data: SphereBody.omit({ room_id: true }) }),
]);

type BatchInput = z.infer<typeof BatchObjectSchema>;

function toWireFromBatch(input: BatchInput): WireObject {
  const id = randomUUID();
  if (input.type === "box") {
    const d = input.data;
    return {
      type: "box",
      data: {
        id,
        cx: d.center.x,
        cy: d.center.y,
        cz: d.center.z,
        width: d.width,
        height: d.height,
        depth: d.depth,
        color: d.color?.toLowerCase() ?? null,
      },
    };
  }
  if (input.type === "cylinder") {
    const d = input.data;
    return {
      type: "cylinder",
      data: {
        id,
        cx: d.center.x,
        cy: d.center.y,
        cz: d.center.z,
        radius: d.radius,
        height: d.height,
        color: d.color?.toLowerCase() ?? null,
      },
    };
  }
  const d = input.data;
  return {
    type: "sphere",
    data: {
      id,
      cx: d.center.x,
      cy: d.center.y,
      cz: d.center.z,
      radius: d.radius,
      color: d.color?.toLowerCase() ?? null,
    },
  };
}

export function registerTools(server: McpServer): void {
  server.tool(
    "list_objects",
    "List every shape currently placed in a polypad room. Returns boxes, cylinders, and spheres with ids, centers, dimensions, and colors.",
    { room_id: z.string().optional() },
    async ({ room_id }) => {
      try {
        const roomId = resolveRoomId(room_id);
        const data = await listObjects(roomId);
        return ok(JSON.stringify({ room_id: roomId, ...data }, null, 2));
      } catch (err) {
        return fail(err);
      }
    }
  );

  server.tool(
    "create_box",
    "Place an axis-aligned box in the room. Center is the box's geometric center. Returns the new object id.",
    BoxBody.shape,
    async (args) => {
      try {
        const roomId = resolveRoomId(args.room_id);
        const id = randomUUID();
        const wire: WireObject = {
          type: "box",
          data: {
            id,
            cx: args.center.x,
            cy: args.center.y,
            cz: args.center.z,
            width: args.width,
            height: args.height,
            depth: args.depth,
            color: args.color?.toLowerCase() ?? null,
          },
        };
        await createObject(roomId, wire);
        return ok(JSON.stringify({ ok: true, id, type: "box", room_id: roomId }));
      } catch (err) {
        return fail(err);
      }
    }
  );

  server.tool(
    "create_cylinder",
    "Place an upright cylinder (Y-axis) in the room. Center is the cylinder's midpoint. Returns the new object id.",
    CylinderBody.shape,
    async (args) => {
      try {
        const roomId = resolveRoomId(args.room_id);
        const id = randomUUID();
        const wire: WireObject = {
          type: "cylinder",
          data: {
            id,
            cx: args.center.x,
            cy: args.center.y,
            cz: args.center.z,
            radius: args.radius,
            height: args.height,
            color: args.color?.toLowerCase() ?? null,
          },
        };
        await createObject(roomId, wire);
        return ok(JSON.stringify({ ok: true, id, type: "cylinder", room_id: roomId }));
      } catch (err) {
        return fail(err);
      }
    }
  );

  server.tool(
    "create_sphere",
    "Place a sphere in the room. Center is the sphere's center. Returns the new object id.",
    SphereBody.shape,
    async (args) => {
      try {
        const roomId = resolveRoomId(args.room_id);
        const id = randomUUID();
        const wire: WireObject = {
          type: "sphere",
          data: {
            id,
            cx: args.center.x,
            cy: args.center.y,
            cz: args.center.z,
            radius: args.radius,
            color: args.color?.toLowerCase() ?? null,
          },
        };
        await createObject(roomId, wire);
        return ok(JSON.stringify({ ok: true, id, type: "sphere", room_id: roomId }));
      } catch (err) {
        return fail(err);
      }
    }
  );

  server.tool(
    "create_objects",
    "Place many shapes in a single request. Use this for scenes or loops to avoid per-shape latency. Each entry is { type: 'box'|'cylinder'|'sphere', data: { ...shape fields } }.",
    {
      room_id: z.string().optional(),
      objects: z.array(BatchObjectSchema).min(1),
    },
    async ({ room_id, objects }) => {
      try {
        const roomId = resolveRoomId(room_id);
        const wires = objects.map(toWireFromBatch);
        const result = await createObjectsBatch(roomId, wires);
        return ok(
          JSON.stringify({
            ok: true,
            room_id: roomId,
            inserted: result.inserted,
            ids: wires.map((w) => w.data.id),
          })
        );
      } catch (err) {
        return fail(err);
      }
    }
  );

  server.tool(
    "move_object",
    "Move an existing object to a new center position. Does not change shape dimensions.",
    {
      room_id: z.string().optional(),
      object_id: z.string().min(1),
      center: VectorSchema,
    },
    async ({ room_id, object_id, center }) => {
      try {
        const roomId = resolveRoomId(room_id);
        await patchObject(roomId, object_id, { center });
        return ok(JSON.stringify({ ok: true, id: object_id, room_id: roomId }));
      } catch (err) {
        return fail(err);
      }
    }
  );

  server.tool(
    "set_object_color",
    "Set an existing object's color. Color must be a hex string like #f00 or #ff0000.",
    {
      room_id: z.string().optional(),
      object_id: z.string().min(1),
      color: z.string().regex(HEX_COLOR, "color must be a hex string like #f00 or #ff0000"),
    },
    async ({ room_id, object_id, color }) => {
      try {
        const roomId = resolveRoomId(room_id);
        await patchObject(roomId, object_id, { color: color.toLowerCase() });
        return ok(JSON.stringify({ ok: true, id: object_id, room_id: roomId }));
      } catch (err) {
        return fail(err);
      }
    }
  );

  server.tool(
    "delete_object",
    "Remove an object from the room.",
    {
      room_id: z.string().optional(),
      object_id: z.string().min(1),
    },
    async ({ room_id, object_id }) => {
      try {
        const roomId = resolveRoomId(room_id);
        await deleteObject(roomId, object_id);
        return ok(JSON.stringify({ ok: true, id: object_id, room_id: roomId }));
      } catch (err) {
        return fail(err);
      }
    }
  );
}
