import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry.js";

extendZodWithOpenApi(z);

// ─── Shared ───────────────────────────────────────────────────────────────────

export const Vec3Schema = registry.register(
  "Vec3",
  z.object({ x: z.number(), y: z.number(), z: z.number() }),
);

// ─── Wire object shapes ───────────────────────────────────────────────────────

export const WireBoxSchema = registry.register(
  "WireBox",
  z.object({
    id: z.string(),
    cx: z.number(),
    cy: z.number(),
    cz: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    depth: z.number().positive(),
    color: z.string().nullable(),
  }),
);

export const WireCylinderSchema = registry.register(
  "WireCylinder",
  z.object({
    id: z.string(),
    cx: z.number(),
    cy: z.number(),
    cz: z.number(),
    radius: z.number().positive(),
    height: z.number().positive(),
    color: z.string().nullable(),
  }),
);

export const WireSphereSchema = registry.register(
  "WireSphere",
  z.object({
    id: z.string(),
    cx: z.number(),
    cy: z.number(),
    cz: z.number(),
    radius: z.number().positive(),
    color: z.string().nullable(),
  }),
);

export const WireMeshSchema = registry.register(
  "WireMesh",
  z.object({
    id: z.string(),
    cx: z.number(),
    cy: z.number(),
    cz: z.number(),
    positions: z.string().openapi({ description: "Base64-encoded Float32Array of vertex positions" }),
    normals: z.string().openapi({ description: "Base64-encoded Float32Array of vertex normals" }),
    indices: z
      .string()
      .nullable()
      .openapi({ description: "Base64-encoded Uint32Array of face indices, or null for non-indexed geometry" }),
    edges: z
      .string()
      .nullable()
      .openapi({ description: "Base64-encoded Float32Array of polygon-edge segment endpoints, or null" }),
    color: z.string().nullable(),
  }),
);

export const WireObjectSchema = registry.register(
  "WireObject",
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("box"), data: WireBoxSchema }),
    z.object({ type: z.literal("cylinder"), data: WireCylinderSchema }),
    z.object({ type: z.literal("sphere"), data: WireSphereSchema }),
    z.object({ type: z.literal("mesh"), data: WireMeshSchema }),
  ]),
);

// ─── Room responses ───────────────────────────────────────────────────────────

export const GetObjectsResponseSchema = registry.register(
  "GetObjectsResponse",
  z.object({
    boxes: z.array(WireBoxSchema),
    cylinders: z.array(WireCylinderSchema),
    spheres: z.array(WireSphereSchema),
    meshes: z.array(WireMeshSchema),
  }),
);

// ─── Request bodies ───────────────────────────────────────────────────────────

export const CreateRoomBodySchema = registry.register(
  "CreateRoomBody",
  z.object({ name: z.string().min(1).max(100) }),
);

export const BatchCreateObjectBodySchema = registry.register(
  "BatchCreateObjectBody",
  z.object({ objects: z.array(WireObjectSchema).min(1) }),
);

export const UpdatePatchSchema = registry.register(
  "UpdatePatch",
  z.object({
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/)
      .optional(),
    center: Vec3Schema.optional(),
    width: z.number().positive().finite().optional(),
    height: z.number().positive().finite().optional(),
    depth: z.number().positive().finite().optional(),
    radius: z.number().positive().finite().optional(),
  }),
);

// ─── Response bodies ──────────────────────────────────────────────────────────

export const CreateRoomResponseSchema = registry.register(
  "CreateRoomResponse",
  z.object({ id: z.string(), inviteCode: z.string() }),
);

export const VerifyRoomResponseSchema = registry.register(
  "VerifyRoomResponse",
  z.object({ ok: z.boolean() }),
);

export const CreateObjectResponseSchema = registry.register(
  "CreateObjectResponse",
  z.object({ ok: z.literal(true), id: z.string() }),
);

export const BatchCreateObjectResponseSchema = registry.register(
  "BatchCreateObjectResponse",
  z.object({
    ok: z.literal(true),
    inserted: z.number().int().nonnegative(),
    ids: z.array(z.string()),
  }),
);

export const UpdateObjectResponseSchema = registry.register(
  "UpdateObjectResponse",
  z.object({ ok: z.literal(true) }),
);

export const ErrorResponseSchema = registry.register(
  "ErrorResponse",
  z.object({ error: z.string() }),
);

export const ConflictResponseSchema = registry.register(
  "ConflictResponse",
  z.object({
    error: z.enum(["locked", "selected"]),
    lockedBy: z.string().optional(),
    selectedBy: z.string().optional(),
  }),
);
