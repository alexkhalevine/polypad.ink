import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";

export const registry = new OpenAPIRegistry();

export function createGenerator(): OpenApiGeneratorV31 {
  return new OpenApiGeneratorV31(registry.definitions);
}
