import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";

import {
  buildWorldGeometry,
  weldByPosition,
  selectCoplanarFaceGroup,
  extrudeFaceGroup,
  finalizeExtruded,
  type ExtrudeResult,
} from "../extrude-utils";
import { computeBoundingSize } from "../csg-utils";
import { useRoomStore } from "../room-store";
import type { PlacedBox, PlacedMesh } from "../types";

// ─── Store: face-select is on by default and survives a reset ───────────────────
// These two defaults are what make "select an object, click a face → extrude" work
// without arming a tool. If the default flips back to false (or reset clears it),
// the user is back to "clicking a face does nothing" on a placed mesh.

describe("room-store faceSelectEnabled", () => {
  beforeEach(() => {
    useRoomStore.setState({ faceSelectEnabled: true });
  });

  it("defaults to true so a face click starts an extrude without a tool armed", () => {
    expect(useRoomStore.getInitialState().faceSelectEnabled).toBe(true);
  });

  it("is preserved across resetEditorState (Esc/deselect keeps the preference)", () => {
    useRoomStore.getState().resetEditorState();
    expect(useRoomStore.getState().faceSelectEnabled).toBe(true);
  });

  it("stays off across a reset once the user opts out via toggleFaceSelect", () => {
    useRoomStore.getState().toggleFaceSelect();
    expect(useRoomStore.getState().faceSelectEnabled).toBe(false);
    useRoomStore.getState().resetEditorState();
    expect(useRoomStore.getState().faceSelectEnabled).toBe(false);
  });
});

// ─── Geometry: a finalized (extruded) mesh can be extruded again ────────────────
// Regression target. The first extrude produces a non-indexed, flat-shaded,
// re-centered PlacedMesh (indices: null). The user reported the result "cannot be
// edited" — the suspected geometry risk was that re-selecting a coplanar face on
// that mesh would fail. weldByPosition re-indexes the non-indexed mesh, so the
// indexed precondition of selectCoplanarFaceGroup holds and a second extrude works.

/**
 * Pick the triangle whose face normal points most strongly along `dir` and return
 * a (normal, point) pair guaranteed to land on a coplanar face of `geo`.
 * `geo` must be indexed.
 */
function pickFaceByDirection(
  geo: THREE.BufferGeometry,
  dir: THREE.Vector3,
): { normal: { x: number; y: number; z: number }; point: { x: number; y: number; z: number } } {
  const index = geo.getIndex();
  if (!index) throw new Error("pickFaceByDirection requires an indexed geometry");
  const pos = geo.getAttribute("position");
  const idx = index.array;
  const triCount = index.count / 3;

  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();

  let bestDot = -Infinity;
  let best: { normal: THREE.Vector3; point: THREE.Vector3 } | null = null;
  const d = dir.clone().normalize();

  for (let t = 0; t < triCount; t++) {
    va.fromBufferAttribute(pos, idx[t * 3]);
    vb.fromBufferAttribute(pos, idx[t * 3 + 1]);
    vc.fromBufferAttribute(pos, idx[t * 3 + 2]);
    ab.subVectors(vb, va);
    ac.subVectors(vc, va);
    n.crossVectors(ab, ac).normalize();
    const dot = n.dot(d);
    if (dot > bestDot) {
      bestDot = dot;
      best = { normal: n.clone(), point: va.clone() };
    }
  }
  if (!best) throw new Error("no triangle found");
  return {
    normal: { x: best.normal.x, y: best.normal.y, z: best.normal.z },
    point: { x: best.point.x, y: best.point.y, z: best.point.z },
  };
}

/** Run one extrude of the face most aligned with `dir`, returning the baked result. */
function extrudeAlong(
  worldGeo: THREE.BufferGeometry,
  dir: THREE.Vector3,
  distance: number,
): ExtrudeResult {
  const welded = weldByPosition(worldGeo);
  const { normal, point } = pickFaceByDirection(welded, dir);
  const group = selectCoplanarFaceGroup(welded, normal, point);

  // The picked face must resolve to a real coplanar group (≥1 triangle, ≥3 verts,
  // a closed-ish boundary loop) or there is nothing to extrude.
  expect(group.triIndices.length).toBeGreaterThanOrEqual(1);
  expect(group.vertexIndices.length).toBeGreaterThanOrEqual(3);
  expect(group.boundaryLoop.length).toBeGreaterThanOrEqual(3);

  const extruded = extrudeFaceGroup(welded, group, normal, distance);
  return finalizeExtruded(extruded);
}

function meshFromResult(result: ExtrudeResult): PlacedMesh {
  // Mirrors handleExtrudeCommit: position = centroid, geometry centered, indices null.
  return {
    id: "mesh-1",
    position: result.centroid.clone(),
    positions: result.positions,
    normals: result.normals,
    indices: result.indices,
    edges: result.edges,
    color: null,
  };
}

function assertRenderableMesh(result: ExtrudeResult) {
  expect(result.positions.length).toBeGreaterThan(0);
  // Non-indexed flat triangles → length is a multiple of 9 (3 verts × 3 floats).
  expect(result.positions.length % 9).toBe(0);
  expect(result.indices).toBeNull();
  expect(result.normals.length).toBe(result.positions.length);
  for (const v of result.positions) expect(Number.isFinite(v)).toBe(true);
  for (const v of result.normals) expect(Number.isFinite(v)).toBe(true);
  // Non-degenerate volume in every axis (not a torn/empty buffer).
  const size = computeBoundingSize(result.positions);
  expect(size.x).toBeGreaterThan(1e-3);
  expect(size.y).toBeGreaterThan(1e-3);
  expect(size.z).toBeGreaterThan(1e-3);
}

describe("re-extrude of a finalized mesh", () => {
  const box: PlacedBox = {
    id: "box-1",
    position: new THREE.Vector3(0, 0, 0),
    width: 1,
    height: 1,
    depth: 1,
    color: null,
  };

  it("extrudes the top face of a box, then the top face of the result again", () => {
    // First extrude (primitive box, top face up).
    const result1 = extrudeAlong(buildWorldGeometry(box, "box"), new THREE.Vector3(0, 1, 0), 0.5);
    assertRenderableMesh(result1);

    // Build the PlacedMesh exactly as the commit would.
    const mesh1 = meshFromResult(result1);

    // Second extrude — the regression: a face of the baked mesh, no tool re-armed.
    const result2 = extrudeAlong(
      buildWorldGeometry(mesh1, "mesh"),
      new THREE.Vector3(0, 1, 0),
      0.5,
    );
    assertRenderableMesh(result2);

    // The shape genuinely grew taller along the extrude axis.
    expect(computeBoundingSize(result2.positions).y).toBeGreaterThan(
      computeBoundingSize(result1.positions).y,
    );
  });

  it("extrudes a SIDE face of the result without tearing the mesh", () => {
    const result1 = extrudeAlong(buildWorldGeometry(box, "box"), new THREE.Vector3(0, 1, 0), 0.5);
    const mesh1 = meshFromResult(result1);

    // Pull a side face out — a different face than the first extrude.
    const result2 = extrudeAlong(
      buildWorldGeometry(mesh1, "mesh"),
      new THREE.Vector3(1, 0, 0),
      0.5,
    );
    assertRenderableMesh(result2);
    // Grew along X (the side we pulled).
    expect(computeBoundingSize(result2.positions).x).toBeGreaterThan(
      computeBoundingSize(result1.positions).x,
    );
  });

  it("supports a third extrude (chained re-extrude stays welded and selectable)", () => {
    let world = buildWorldGeometry(box, "box");
    let result = extrudeAlong(world, new THREE.Vector3(0, 1, 0), 0.4);
    for (let i = 0; i < 2; i++) {
      assertRenderableMesh(result);
      world = buildWorldGeometry(meshFromResult(result), "mesh");
      result = extrudeAlong(world, new THREE.Vector3(0, 1, 0), 0.4);
    }
    assertRenderableMesh(result);
  });
});
