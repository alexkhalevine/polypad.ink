fix this bugs:

1. (GPU memory): GridHelper recreated every render, EdgesGeometry recreated every render, geometries never disposed

follow-ups from object rotation (see CHANGELOG "added object rotation"):

2. Rotate should work with the Align tool — `align-math.ts` still computes alignment assuming axis-aligned bounding boxes, so aligning a rotated object against another (rotated or not) can land it in the wrong spot.
3. Rotate should work with the Boolean tool — `csg-utils.ts`'s `brushFrom` builds CSG brushes without applying the object's rotation, so boolean ops (union/subtract/intersect) on a rotated source or target will use its unrotated orientation.
4. On-object dimension helper labels (`dimension-helpers.tsx`) are positioned assuming no rotation — labels can sit off the actual rotated edges of a selected box/cylinder/sphere.

placeholder UI controls still needing real implementations (see CHANGELOG "reworked app UI"):

5. Scale tool (tool rail) — currently a disabled stub; no scale/resize-via-gizmo exists yet (dimensions can only be edited via the inspector's numeric fields).
6. Orbit-camera tool-rail button — orbiting already works by dragging in the viewport (drei OrbitControls); the dedicated button itself is a no-op and should either be wired to something meaningful or removed.
7. Group (contextual object toolbar) — disabled stub; no multi-select/grouping model exists.
8. Cone + "+ more" (shape dock) — disabled stubs; no cone primitive on the server/client yet.
9. Opacity slider (inspector Display section) — disabled stub; `PlacedBox/Cylinder/Sphere/Mesh` have no opacity field.
10. Zoom in / zoom out (status bar) — presentational no-ops; real zoom currently only happens via scroll/pinch on OrbitControls. Consider wiring these to the camera, or removing them.
