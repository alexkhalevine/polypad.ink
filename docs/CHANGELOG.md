# added OpenAPI docs and auto-generated SDK client

### commit hash:
### date: 23.05.26

### description

Introduces OpenAPI 3.1 documentation for the Express server and a typed auto-generated TypeScript client consumed by the Next.js web app. Zod schemas are now the single source of truth for both server-side runtime validation and the API spec.

**Server**

- `apps/server/src/openapi/schemas.ts` — All request bodies, response types, and wire shapes defined as Zod schemas registered with the OpenAPI registry. Replaces the manual `typeof` / regex guards in routes and eliminates the hand-maintained `WireBox` / `WireObject` / etc. interfaces in `types.ts`.

- `apps/server/src/openapi/spec.ts` — All 7 REST endpoints registered with tags, parameters, request bodies, and response codes. Exports `buildOpenApiSpec()` called once at server startup.

- `apps/server/src/openapi/registry.ts` — `OpenAPIRegistry` singleton shared across schema and spec files.

- `apps/server/src/index.ts` — Two new endpoints mounted: `GET /openapi.json` (raw spec, open CORS) and `GET /api-docs` (Swagger UI).

- `apps/server/src/types.ts` — Wire type aliases now derived from `z.infer<>` instead of duplicate interfaces.

- Routes updated — `routes/rooms.ts` and `routes/geometryObjects.ts` use `safeParse` from the Zod schemas instead of manual type guards.

- `apps/server/scripts/export-spec.ts` + `generate:spec` npm script — writes `apps/server/openapi.json` for use by the web build without requiring the server to be running.

**Web**

- `apps/web/orval.config.ts` — orval configuration pointing at `apps/server/openapi.json`, generating a React Query v5 client split by tag into `apps/web/src/api/generated/`.

- `apps/web/src/api/mutator/custom-fetch.ts` — Custom fetch mutator reusing the existing `API_BASE`, `jsonHeaders()`, and `ApiError` utilities.

- `apps/web/src/api/generated/` — Committed generated client: 5 typed fetch functions (`getRoomsIdObjects`, `postRoomsIdObjects`, `postRoomsIdObjectsBatch`, `deleteRoomsIdObjectsObjectId`, `patchRoomsIdObjectsObjectId`) and 17 model type files.

- Query hooks updated — `use-room-objects`, `use-place-object`, `use-delete-object`, `use-update-object-position`, `use-update-object-dimensions`, `use-update-object-color` now delegate to the generated typed functions while preserving existing `roomKeys` query keys and error handling.

**Workflow for future API changes**

```sh
pnpm --filter server generate:spec   # rewrites apps/server/openapi.json
pnpm --filter web generate:api       # rewrites apps/web/src/api/generated/
```

---

# added boolean operations

### commit hash: e849d9da0ec187f4ad294c2963e6bf804b2beaff
### date: 23.05.26

### description

This PR adds a complete boolean constructive solid geometry (CSG) workflow to the room editor:

- csg-utils.ts — Core CSG engine built on three-bvh-csg. Converts any placed primitive (box, cylinder, sphere, or mesh) into a Brush, evaluates the 5 boolean operations (Union, Subtract A−B, Subtract B−A, XOR, Intersect), and returns re-centered geometry ready to persist.

- boolean-panel.tsx — Sidebar UI panel for the boolean mode. Shows operation picker buttons (1–5 keys), target-selection status, and Apply/Cancel actions.

- boolean-thumbnail.tsx — Tiny live 3D preview rendered inside each of the 5 picker buttons using a small R3F canvas with an orthographic camera.

- boolean-preview-overlay.tsx — In-scene translucent overlay that shows the resulting shape in real time as the user picks an operation, before committing.

- placed-mesh.tsx — New scene component to render the PlacedMesh result objects (the output of a boolean op) with proper edge lines.

- Backend + store changes — New PlacedMesh wire type, DB persistence, room-store state (booleanOperation, booleanSource), and socket handling for creating and moving compound result objects.

