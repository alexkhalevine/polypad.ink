import { z } from "zod";
import { registry, createGenerator } from "./registry.js";
import {
  CreateRoomBodySchema,
  CreateRoomResponseSchema,
  VerifyRoomResponseSchema,
  WireObjectSchema,
  GetObjectsResponseSchema,
  CreateObjectResponseSchema,
  BatchCreateObjectBodySchema,
  BatchCreateObjectResponseSchema,
  UpdatePatchSchema,
  UpdateObjectResponseSchema,
  ErrorResponseSchema,
  ConflictResponseSchema,
} from "./schemas.js";

// ─── Rooms ────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/rooms",
  tags: ["rooms"],
  summary: "Create a new room",
  request: {
    body: {
      content: { "application/json": { schema: CreateRoomBodySchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Room created",
      content: { "application/json": { schema: CreateRoomResponseSchema } },
    },
    400: {
      description: "Invalid name",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Room with that name already exists",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/rooms/{id}/verify",
  tags: ["rooms"],
  summary: "Verify access to a room using an invite code",
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ code: z.string() }),
  },
  responses: {
    200: {
      description: "Verification result",
      content: { "application/json": { schema: VerifyRoomResponseSchema } },
    },
    404: {
      description: "Room not found or invite code mismatch",
      content: { "application/json": { schema: VerifyRoomResponseSchema } },
    },
  },
});

// ─── Objects ──────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/rooms/{id}/objects",
  tags: ["objects"],
  summary: "List all geometry objects in a room",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "All geometry objects grouped by type",
      content: { "application/json": { schema: GetObjectsResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/rooms/{id}/objects",
  tags: ["objects"],
  summary: "Create a single geometry object",
  request: {
    params: z.object({ id: z.string() }),
    headers: z.object({ "x-polypad-user-id": z.string().optional() }),
    body: {
      content: { "application/json": { schema: WireObjectSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Object created",
      content: { "application/json": { schema: CreateObjectResponseSchema } },
    },
    400: {
      description: "Invalid object format",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Room object limit reached",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/rooms/{id}/objects/batch",
  tags: ["objects"],
  summary: "Batch create geometry objects",
  request: {
    params: z.object({ id: z.string() }),
    headers: z.object({ "x-polypad-user-id": z.string().optional() }),
    body: {
      content: { "application/json": { schema: BatchCreateObjectBodySchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Objects created",
      content: { "application/json": { schema: BatchCreateObjectResponseSchema } },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Would exceed room object limit",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/rooms/{id}/objects/{objectId}",
  tags: ["objects"],
  summary: "Delete a geometry object",
  request: {
    params: z.object({ id: z.string(), objectId: z.string() }),
    headers: z.object({ "x-polypad-user-id": z.string().optional() }),
  },
  responses: {
    204: { description: "Object deleted" },
    404: {
      description: "Object not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Object is locked or selected by another user",
      content: { "application/json": { schema: ConflictResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/rooms/{id}/objects/{objectId}",
  tags: ["objects"],
  summary: "Update properties of a geometry object",
  description:
    "Partially update an object's color, position (center), or dimensions. Fields not included in the request are left unchanged.",
  request: {
    params: z.object({ id: z.string(), objectId: z.string() }),
    headers: z.object({ "x-polypad-user-id": z.string().optional() }),
    body: {
      content: { "application/json": { schema: UpdatePatchSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Object updated",
      content: { "application/json": { schema: UpdateObjectResponseSchema } },
    },
    400: {
      description: "Invalid patch fields",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Object not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Object is locked or selected by another user",
      content: { "application/json": { schema: ConflictResponseSchema } },
    },
  },
});

// ─── Document builder ─────────────────────────────────────────────────────────

export function buildOpenApiSpec() {
  const generator = createGenerator();
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Polypad API",
      version: "1.0.0",
      description:
        "REST API for the Polypad collaborative 3D room editor. Manage rooms and geometry objects. Real-time collaboration uses Socket.IO (not documented here).",
    },
    servers: [{ url: process.env.API_BASE_URL ?? "http://localhost:4000" }],
  });
}
