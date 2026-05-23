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

