import type { z } from "zod";
import type {
  WireBoxSchema,
  WireCylinderSchema,
  WireSphereSchema,
  WireMeshSchema,
  WireObjectSchema,
  GetObjectsResponseSchema,
  Vec3Schema,
} from "./openapi/schemas.js";

export type Vec3 = z.infer<typeof Vec3Schema>;
export type WireBox = z.infer<typeof WireBoxSchema>;
export type WireCylinder = z.infer<typeof WireCylinderSchema>;
export type WireSphere = z.infer<typeof WireSphereSchema>;
export type WireMesh = z.infer<typeof WireMeshSchema>;
export type WireObject = z.infer<typeof WireObjectSchema>;
export type GetObjectsResponse = z.infer<typeof GetObjectsResponseSchema>;
