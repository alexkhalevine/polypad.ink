# added Face selection tool for meshes

### commit hash:
### date: 02.06.26

### description

Adds a dedicated **Face** tool for selecting individual faces of a mesh (visual highlight; a foundation for future per-face operations). The button is enabled only when a mesh is selected (and via the `F` shortcut). While active: **hovering** the mesh highlights its edges; **clicking** a face highlights the edges *and* fills that face translucently. Edges are dim when idle so hover reads clearly. Whole-object selection (move/delete/color) is unaffected.

Reuses the extrude face-resolution stack — `pickFace` turns the raycast hit into a `{normal, point}`, and `selectCoplanarFaceGroup` flood-fills the connected coplanar triangles so a whole face (e.g. a box side or a cap) highlights, not a single triangle.

- `apps/web/app/components/face-highlight-overlay.tsx` — New. Welds the mesh, resolves the clicked face's triangle group, and renders a translucent fill (`faceGeometryFromGroup`, `polygonOffset` to avoid z-fighting).
- `apps/web/app/room/[id]/_client/extrude-utils.ts` — New `faceGeometryFromGroup(base, group)` helper.
- `apps/web/app/room/[id]/_client/room-store.ts` + `types.ts` — `"face"` tool; `selectedFace` state (`{ objectId } & {normal,point}`), cleared in `resetEditorState`.
- `apps/web/app/components/menu.tsx` — **Face** button, enabled for mesh selections.
- `apps/web/app/room/[id]/_client/hooks/use-room-editor.ts` — `handleFaceSelect`; clears face state on tool switch / deselect / Esc; `F` shortcut.
- `apps/web/app/room/[id]/_client/scene.tsx` — face-pick on click of the selected mesh; mesh hover/selected edge-highlight conditions include the Face tool; renders `FaceHighlightOverlay`.

---

# persist mesh edges so extrude shows construction edges (Blender-style)

### commit hash:
### date: 02.06.26

### description

Follow-up to the extrude tool. Pulling a flat face straight out produces side walls that are **coplanar** with the existing sides, so Three.js `EdgesGeometry` (feature edges only) hid the original face's rim loop — the "extrude seam" Blender keeps visible. That seam can't be recovered from triangle soup, so meshes now **carry an explicit polygon-edge list** that is generated at extrude time and persisted. Also: the dimensions panel now shows a **read-only bounding box (W×H×D)** for mesh objects (previously blank, since meshes have no parametric dimensions).

- `apps/server/src/db.ts`, `src/schema.ts`, `src/services/roomService.ts`, `src/openapi/schemas.ts` — new nullable `edges` column / `WireMesh.edges` field (base64 Float32Array of line-segment endpoints). `db.ts` adds the column to the `CREATE TABLE` and an idempotent `ALTER TABLE … ADD COLUMN edges` migration for existing dev DBs. Spec + web client regenerated (`generate:spec` / `generate:api`).

- `apps/web/app/room/[id]/_client/extrude-utils.ts` — `featureEdges` (clean edges of a primitive via `EdgesGeometry`), `buildExtrudeEdges` (transforms the source edges and adds the rim loop at the original position + wall verticals — the construction edges), and `finalizeExtruded` now also re-centers and returns the edge buffer. `ExtrudeResult` gains `edges`. Repeated extrudes accumulate by reading the source mesh's stored edges.

- `apps/web/app/components/placed-mesh.tsx` — renders `mesh.edges` as `LineSegments` when present; falls back to `EdgesGeometry` otherwise (boolean results / pre-edge meshes).

- `apps/web/app/components/extrude-overlay.tsx`, `hooks/use-room-editor.ts` — overlay computes the edge buffer on commit; `handleExtrudeCommit` persists it. Boolean results pass `edges: null`; clone copies the source's edges.

- `apps/web/…/types.ts`, `queries/wire-types.ts`, `queries/wire-converters.ts` — `PlacedMesh.edges` / wire encode-decode (base64, null-safe).

- `apps/web/app/components/dimentions-panel.tsx` + `csg-utils.ts` — `computeBoundingSize` helper and a read-only W×H×D branch for meshes (new `readOnly` flag on `DimensionInput`).

---

# added extrude face tool (real mesh extrude — box, cylinder & mesh)

### commit hash:
### date: 29.05.26

### description

Adds a Blender/3ds-Max-style **Extrude** tool that *creates new geometry*. After selecting a box, cylinder, or mesh, the user clicks **Extrude** (or presses `E`), then clicks a face: the face rim highlights, an outward cyan arrow appears, and a small input field (styled like the dimension helpers) shows the extrusion distance. Dragging the arrow pulls the selected face outward along its normal — duplicating the face, moving the copy, and stitching new **side walls** between the old rim and the new position — and live-updates the input; typing the distance applies the same. The extruded result becomes an editable `PlacedMesh`, so faces of meshes (boolean results, previously-extruded objects) can be extruded again to build complex shapes (L-shapes, steps, towers). Outward only this phase; cylinder is restricted to the flat top/bottom caps; sphere is excluded.

Key design points:
- **No "update mesh geometry" API exists** (only place / delete / position / dimensions / color). So each committed extrude follows the boolean pattern: `placeObject.mutate({type:"mesh"})` a new mesh and delete the original. The new mesh stays selected with the tool active for chained extrudes.
- **Live preview is client-only** — while dragging, the original object is hidden and the growing extruded mesh is rendered in-scene; the single server write happens on release (or input commit). When snap-to-grid is on, the drag distance snaps to integers.

- `apps/web/app/room/[id]/_client/extrude-utils.ts` — New. Pure geometry: `buildWorldGeometry` (box/cylinder/mesh → world-space `BufferGeometry`), `weldByPosition` (position-only `mergeVertices` so non-indexed boolean soup and split-vertex primitives gain shared-edge adjacency), `selectCoplanarFaceGroup` (flood-fill the connected coplanar triangles at the hit point and find the boundary edge loop), `extrudeFaceGroup` (offset the face vertices and add bridging side-wall quads), and `finalizeExtruded` (flat-shade via `toNonIndexed` + `computeVertexNormals`, then re-center with `computeCentroid`). `previewGeometry` produces the live drag preview.

- `apps/web/app/components/extrude-overlay.tsx` — Rewritten. Builds the welded base + resolved face group once per pick (memoized), renders the flat-shaded preview mesh + edges + rim highlight, the draggable arrow, and the `<Html>` distance input. Drag math intersects the pointer ray with a camera-facing plane through the extrusion axis, projects onto the outward normal, clamps `≥ 0`, and snap-rounds when enabled; commits `finalizeExtruded(extrudeFaceGroup(...))` to `onExtrudeCommit`.

- `apps/web/app/room/[id]/_client/hooks/use-room-editor.ts` — `handleExtrudeFaceSelect` stores the picked face; `handleExtrudeCommit` locks the original, places the new mesh, then deletes the original and selects the result (keeping the extrude tool active) — mirroring `handleBooleanApply`. `E` shortcut now also covers meshes.

- `apps/web/app/room/[id]/_client/room-store.ts` — `extrudeFace` (now a `{ normal, point }` plane descriptor) and `isExtrudeDragging` state; both cleared in `resetEditorState`. The dragging flag suspends `OrbitControls`.

- `apps/web/app/room/[id]/_client/types.ts` — `ToolType` gains `"extrude"`; `ExtrudeFace` is `{ normal: {x,y,z}; point: {x,y,z} }` (world-space hit plane, works for any object).

- `apps/web/app/components/menu.tsx` — **Extrude** button enabled for box, cylinder, and mesh selections.

- `apps/web/app/components/placed-{box,cylinder,mesh}-mesh.tsx` — `onClick` forwards the R3F `ThreeEvent` so the scene can read the hit face normal/point.

- `apps/web/app/room/[id]/_client/scene.tsx` — `pickFace` returns the world-space `{normal, point}` (rejecting cylinder side faces); clicking the selected object while extruding picks a face. The original object is hidden once a face is picked, the `ExtrudeOverlay` renders the preview, and `OrbitControls` is suspended during the drag.

---

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

