# added cone primitive

### commit hash:
### date: 28.06.26

### description

Implements the Cone shape, replacing the previously-disabled "Cone" stub in the shape dock. Geometrically a cone is a cylinder with a zero top radius (`THREE.ConeGeometry(radius, height, 32)`), so Cone reuses the Cylinder primitive's entire code path — the same two dimensions (`radius` + `height`), the same footprint→height draw flow, the same ground-anchored base / `[0, height/2, 0]` inner pivot, and the same treatment by Move/Rotate/Scale, Align, Boolean, Clone, the inspector, and the on-canvas dimension brackets. The discriminator string is `"cone"` throughout. No new mechanisms were invented; cone slots into every existing per-type switch/union as a sibling of cylinder. Full parity was added across all three apps (web client, Express server + SQLite, and the MCP agent server's `create_cone` tool).

- `apps/server/src/schema.ts`, `apps/server/src/db.ts` — Adds `"cone"` to the Drizzle `type` enum and the SQLite CHECK constraint. Adds `migrateConeSupport`, which rebuilds the `geometryObjects` table (SQLite can't alter a CHECK in place) to accept `'cone'` on dev DBs created before this change; runs after the mesh and rotation migrations so every column is already present and can be carried over.

- `apps/server/src/openapi/schemas.ts`, `apps/server/src/types.ts`, `apps/server/src/services/roomService.ts` — Adds `WireConeSchema` (clone of `WireCylinderSchema`), the `cone` arm of the `WireObject` discriminated union, `cones` in `GetObjectsResponse`, `cone: ["radius","height"]` in `ALLOWED_DIMENSIONS`, and `cone` cases in `rowToWire`/`wireToInsert`/`withServerId`/`listObjects`. The shared dimension-patch path already allowed `radius`+`height`. `apps/server/openapi.json` was regenerated.

- `apps/web` — New `PlacedCone` type, `use-cone-draw` hook, `placed-cone-mesh`, and `preview-cone` (each cloned from the cylinder equivalent with `ConeGeometry`). Cone is threaded through `wire-types`/`wire-converters`, `use-room-objects`, `use-room-socket`, `use-room-editor`, `scene.tsx`, `room.tsx`, the `shape-dock` (now an active button), `inspector` (R + H fields), `dimension-helpers` (⌀ + H brackets), `transform-gizmo` (scale snapshot/map), `csg-utils` (`brushFromCone`), `align-math` (AABB identical to cylinder), and the clone/align preview overlays. The orval-generated API client was regenerated to pick up `cones`.

- `apps/mcp/src/wire-types.ts`, `apps/mcp/src/tools.ts` — Adds `WireCone`, a `create_cone` tool (mirrors `create_sphere`, with `radius`+`height`), the `cone` arm of the batch schema + `toWireFromBatch`, and updates the `list_objects`/`create_objects` descriptions.

- `apps/web/e2e/cone-tool.spec.ts` (new) — Draws a cone via the click/click/height flow, selects it, asserts the inspector's R + H dimension fields appear, and checks for no console errors.

---

# added object scaling

### commit hash:
### date: 28.06.26

### description

Wires up the previously-disabled "Scale" tool-rail stub. Selecting an object and entering Scale (button or `E`) shows a drei `TransformControls` gizmo in `mode="scale"`. Objects have no generic "scale" field — only explicit dimensions (box: width/height/depth, cylinder: radius/height, sphere: radius) — so the gizmo's `scale` (which starts at `(1,1,1)` each drag) is treated as a multiplier on a snapshot of the object's dimensions taken at drag-start, mapped back onto those dimension fields, and reset to `(1,1,1)` after each commit so consecutive drags in the same session don't compound. Reuses the existing dimension-persistence path (`useUpdateObjectDimensions` + the `liveDimensions` live-overlay) that already backs the inspector's numeric fields, so no server/schema changes were needed and the inspector reflects gizmo drags live for free.

- `apps/web/app/room/[id]/_client/types.ts` — Adds `"scale"` to `ToolType`.

- `apps/web/app/room/[id]/_client/transform-gizmo.tsx` — `TransformGizmo` now accepts `mode: "translate" | "rotate" | "scale"` and an `onObjectScale` callback. Snapshots the selected object's dimensions on drag-start (`scaleBaseRef`), maps the gizmo's per-axis scale onto box width/height/depth, cylinder radius (averaged from the X/Z handles)/height, or sphere radius (averaged from all three handles) via `mapScale`, clamping to a `MIN_DIM = 0.01` floor matching the inspector's existing field minimum. Resets `obj.scale` to `(1,1,1)` after each persisted commit. Mesh (boolean-result) objects have no dimension fields, so the gizmo doesn't render for them in scale mode. Seeds the gizmo's `rotation` for both rotate and scale modes (so handles align to the object's local axes) and uses `space="local"` for scale.

- `apps/web/app/room/[id]/_client/hooks/use-room-editor.ts` — Adds `handleObjectScale` (mirrors `handleObjectRotate`: persists via `updateObjectDimensions.mutate` on commit, always updates `liveDimensions` for the live overlay) and wires the already-documented `E` keyboard shortcut to enter Scale mode.

- `apps/web/app/room/[id]/_client/tool-rail.tsx` — Scale button is no longer a disabled stub; follows the same `active`/`disabled`/`onClick` pattern as Move/Rotate.

- `apps/web/app/room/[id]/_client/scene.tsx`, `apps/web/app/room/[id]/_client/room.tsx` — Thread `onObjectScale` through to `TransformGizmo`; extend the gizmo-render condition to include `selectedTool === "scale"`.

Known limitation: cylinder and sphere radius scaling averages whichever axis handles are dragged (e.g. dragging only the X handle on a sphere still nudges the radius, since X/Y/Z are averaged together) — there's no way to scale just one axis of a radius-based shape, since they only have one radius field.

---

# added grid opacity control + e2e test coverage

### commit hash: 58eda446d9a3613aaafb189b403a39db7e2a48fd
### date: 28.06.26

### description

Wires up the previously-disabled "Opacity" slider in the inspector's View settings — it now controls the visibility of the 3D ground grid (it was a styled, disabled placeholder; per-object opacity is still out of scope, so the control is scene-wide). Also adds the project's first Playwright e2e test, covering this slider end-to-end, so UI behavior like this can be re-verified on demand instead of only by hand.

- `apps/web/app/room/[id]/_client/room-store.ts` — Adds `gridOpacity: number` (default `1`) and `setGridOpacity` to the Zustand store, following the same pattern as `wireframeEnabled`/`toggleWireframe`.

- `apps/web/app/room/[id]/_client/inspector.tsx` — `DisplayToggles` reads/writes `gridOpacity` instead of rendering a `disabled` slider; label changed to "Grid opacity" with a live percentage readout.

- `apps/web/app/room/[id]/_client/scene.tsx` — The `THREE.GridHelper` is now built via `useMemo` keyed on `gridOpacity`, with `material.transparent = true` and `material.opacity` set from the store value.

- `apps/web/playwright.config.ts` (new), `apps/web/e2e/grid-opacity.spec.ts` (new) — First Playwright test in the repo. Creates a throwaway room via the server API, asserts the slider is enabled, and drives it through 100% → 0% → 50%, checking the grid-opacity label and that no console errors fire. Run with `pnpm --filter web test:e2e` (requires the server running on port 4000; auto-starts the web dev server if it isn't already up).

- `apps/web/package.json` — Adds `@playwright/test` devDependency and `test:e2e` script.

---

# added full screen mode

### commit hash:
### date: 21.06.26

### description

Wires up the previously-decorative "Fit to view" button in the bottom-left status bar so it actually toggles full screen for the editor. Clicking it puts the whole room view — 3D canvas plus all docked chrome (top bar, tool rail, inspector, shape dock, status bar) — into the browser's native Fullscreen API; clicking again, pressing `F`, or hitting the browser's native Escape exits it.

- `apps/web/app/room/[id]/_client/hooks/use-fullscreen.ts` — New hook. Takes a ref to the element to fullscreen; exposes `isFullscreen` (kept in sync via a `fullscreenchange` listener so it tracks native Escape exits, not just our own button) and `toggle()` (calls `requestFullscreen()` / `exitFullscreen()`, swallowing rejection since the browser can deny the request). Owns its own `F` keydown shortcut, guarded against firing while an input/textarea is focused.

- `apps/web/app/room/[id]/_client/room.tsx` — Attaches a ref to the root container (the div wrapping `Scene` and all docked chrome) and calls `useFullscreen` on it; passes `isFullscreen` / `onToggleFullscreen` down to `StatusBar`.

- `apps/web/app/room/[id]/_client/status-bar.tsx` — The "Fit to view" `ZoomButton` is now a real toggle: icon swaps `Maximize2` (enter) ↔ `Minimize2` (exit), label/title swaps "Full screen" ↔ "Exit full screen".

- `apps/web/app/room/[id]/_client/shortcuts-help.tsx` — Adds `F — Full screen` to the shortcuts list.

---

# reworked app UI (room creation + 3D editor)

### commit hash: 66dfe195c0bfce5f9428286f32dc351e99b5c57d
### date: 21.06.26

### description

Hi-fi redesign of the room-creation screen and the 3D editor chrome, based on `README_design.md` (a Claude Design hand-off spec). Replaces the light DaisyUI `cupcake` look and the single cluttered bottom `Menu` bar with a dark glassmorphism aesthetic organized into docked regions, scoped only to `/room/setup` and `/room/[id]` — the homepage keeps its original theme/fonts. Icons moved to `lucide-react`. Tools without a real implementation yet (Rotate was still a stub at this point, Scale, Orbit-camera button, Group, Cone, opacity slider, zoom +/-/fit) ship as styled, disabled/no-op placeholders rather than being hidden, matching the full design spec.

- `apps/web/app/layout.tsx`, `apps/web/app/globals.css` — Adds `Space_Grotesk` / `JetBrains_Mono` fonts and a `.polypad-dark` scoped token system (panel surface/blur, violet/mint accents, caret/live-dot/cursor-float/wire-spin keyframes) without touching the existing Geist/`cupcake` homepage styling.

- `apps/web/app/room/setup/page.tsx`, `room-setup-form.tsx` — Rebuilt as a full-viewport dark hero with a decorative spinning wireframe cube + perspective grid, gradient "Create Room" card, and live status line.

- `apps/web/app/room/[id]/page.tsx`, `room.tsx` — Editor recomposed into docked regions instead of one bottom bar.

- New chrome components: `top-bar.tsx` (wordmark, room pill, presence, Invite/Export), `tool-rail.tsx` (Select/Move real; Rotate/Scale/Orbit stubs), `object-toolbar.tsx` (contextual Align/Boolean/Duplicate/Delete real, Group stub), `shape-dock.tsx` (Box/Cylinder/Sphere real, Cone/"+more" stubs), `status-bar.tsx` (selection coords + zoom/fit pill, all stubs at this point).

- `inspector.tsx` (new) — Replaces `right-panel.tsx` + `dimentions-panel.tsx` (both removed) with a single panel: header, Position grid, Dimensions grid, Material swatches, Display toggles (Snap/Wireframe real, Opacity stub).

- `invite-button.tsx`, `user-avatars.tsx`, `remote-cursors.tsx`, `shortcuts-help.tsx` — Restyled to the dark panel treatment.

- `apps/web/app/components/menu.tsx` — Removed; its responsibilities were redistributed across the new chrome components and inspector.

- `apps/web/app/room/[id]/_client/hooks/use-room-editor.ts` — Adds `handleColorCommit` so the inspector's preset material swatches can commit a color directly (the old flow relied on the native color input's blur event).

- `apps/web/package.json` — Adds `lucide-react`.

---

# added object rotation

### commit hash: eb44b8a63630f4bcf90824eb80997db6ca11ef5f
### date: 21.06.26

### description

Makes the **Rotate** tool real (it shipped as a disabled stub in the UI rework above): a selected object can be rotated on all three axes via a drei `TransformControls` rotation gizmo, with full persistence and real-time sync to collaborators — same end-to-end treatment as move/resize/color. Rotation is Euler XYZ in radians, applied about the object's geometric center (not the bottom-anchor `position` uses), defaulting to `(0,0,0)` so existing objects render unchanged.

**Server**

- `src/schema.ts`, `src/db.ts` — Adds nullable `rx/ry/rz` real columns to `geometryObjects`, plus an idempotent migration (`ALTER TABLE ... ADD COLUMN`) for existing dev databases.
- `src/openapi/schemas.ts` — Adds `rotation: Vec3` to the box/cylinder/sphere/mesh wire schemas and to `UpdatePatchSchema`.
- `src/services/roomService.ts` — Reads/writes `rx/ry/rz` on the row, including for `mesh` (rotation is allowed on every object type, unlike width/height/depth).
- `src/realtime/eventTypes.ts` — `ObjectUpdatedPayload.patch` carries `rotation?: Vec3`.
- Regenerated `apps/server/openapi.json` and the orval-generated web client (`src/api/generated/...`).

**Web**

- `_client/types.ts` — `PlacedBox/Cylinder/Sphere/Mesh` gain `rotation: {x,y,z}`; `ToolType` gains `"rotate"`.
- `_client/queries/wire-types.ts`, `wire-converters.ts` — `rotation` round-trips through every `Wire*` shape, defaulting to `{0,0,0}` when absent.
- `_client/queries/use-update-object-rotation.ts` (new) — Mutation mirroring `use-update-object-position.ts`.
- `_client/realtime/use-room-socket.ts` — `object:updated` handler applies `patch.rotation` to all four object kinds.
- `_client/room-store.ts` — `liveRotations` overlay (mirrors `livePositions`) so drag/typing feedback is immediate before the server round-trip resolves.
- `_client/hooks/use-room-editor.ts` — Merges `liveRotations` into the placed-object lists; adds `handleObjectRotate` (gizmo drag) and `handleRotationCommit` (inspector field edits); `R` keyboard shortcut enters rotate mode when an object is selected.
- `_client/transform-gizmo.tsx` — Supports `mode: "translate" | "rotate"`; in rotate mode the gizmo is anchored at the object's center, seeded from its current Euler rotation, and snaps to 15° increments when Snap-to-grid is on.
- `_client/scene.tsx`, `apps/web/app/components/placed-{box,cylinder,sphere,mesh}-mesh.tsx` — Render rotation about each object's center via a nested pivot group (outer group at the position anchor, inner group at the center offset carrying the rotation).
- `_client/tool-rail.tsx` — Rotate button enabled (active when `selectedTool === "rotate"`, disabled with nothing selected).
- `_client/inspector.tsx` — New Rotation section (X/Y/Z, in degrees) below Position.
- `_client/align-math.ts`, `_client/csg-utils.ts`, `apps/web/app/components/dimension-helpers.tsx` — Inline comments noting the known limitation below.

**Known limitation** — Align and Boolean (CSG) still treat objects as axis-aligned and on-object dimension-helper labels assume no rotation; results/positions may be inaccurate on a rotated object. See `docs/TODO.md`.

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

