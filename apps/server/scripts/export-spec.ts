import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOpenApiSpec } from "../src/openapi/spec.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../openapi.json");

const spec = buildOpenApiSpec();
writeFileSync(outPath, JSON.stringify(spec, null, 2) + "\n");
console.log(`OpenAPI spec written to ${outPath}`);
