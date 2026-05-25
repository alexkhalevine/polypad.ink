# added clone tool

### commit hash:
### date: 25.05.26

### description

Adds a one-shot **Clone** tool to the room editor. The user selects an object, clicks **Clone** in the menu (or presses `C`), moves the cursor over the ground plane to see a wireframe ghost of the source in its own color, and clicks to drop a fresh copy. The clone inherits the source's dimensions and color exactly; only the new position comes from the user.

- `apps/web/app/room/[id]/_client/clone-preview-overlay.tsx` — New component. Renders an `edgesGeometry` ghost of the source (`box` / `cylinder` / `sphere` via the matching Three.js primitive, or `BufferGeometry` built from the mesh's `positions`/`indices` for `mesh`) at the cursor, colored by `source.color`, drawn with `depthTest=false` so it's visible through other geometry.

- `apps/web/app/room/[id]/_client/hooks/use-room-editor.ts` — `handleCloneApply` builds a fresh-id wire payload from the source via the existing `toWireBox`/`toWireCylinder`/`toWireSphere`/`toWireMesh` converters and calls `placeObject.mutate`. `handleGroundPointerMove` updates `clonePreviewPosition` whenever the clone tool is active. A new `handleGroundClick` routes ground clicks to `handleCloneApply` when the clone tool is active and otherwise falls through to the existing draw flow. Keyboard shortcut `C` enters clone mode while an object is selected.

- `apps/web/app/room/[id]/_client/room-store.ts` — Adds `clonePreviewPosition` state and setter. `resetEditorState` (called on Esc) clears it.

- `apps/web/app/room/[id]/_client/types.ts` — `ToolType` gains `"clone"`.

- `apps/web/app/components/menu.tsx` — Adds the **Clone** button to `objectOperationItems`, with the same disabled-when-nothing-selected logic as Move/Align/Boolean.

- `apps/web/app/components/ground-plane.tsx` — New `clickMode` prop (`"draw"` default, `"place"` for clone). In `"place"` mode any click while a tool is active fires `onClick` directly (single-shot placement), and pointer moves are forwarded too so the cursor-follow preview can track.

- `apps/web/app/room/[id]/_client/scene.tsx` — Renders `ClonePreviewOverlay` when the clone tool is active, passes `clickMode="place"` to `GroundPlane` for clone, and shows the crosshair cursor.

- `apps/web/app/utils.ts` — Help-text branch for the clone tool.

---

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

