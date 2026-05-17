import * as THREE from "three";
import {
  Brush,
  Evaluator,
  ADDITION,
  SUBTRACTION,
  REVERSE_SUBTRACTION,
  DIFFERENCE,
  INTERSECTION,
} from "three-bvh-csg";
import type { PlacedBox, PlacedCylinder, PlacedSphere, PlacedMesh, BooleanOperation } from "./types";

export type AnyShape = PlacedBox | PlacedCylinder | PlacedSphere | PlacedMesh;
export type ShapeKind = "box" | "cylinder" | "sphere" | "mesh";

const OP_MAP: Record<BooleanOperation, ReturnType<typeof Number>> = {
  ADDITION: ADDITION as unknown as number,
  SUBTRACTION: SUBTRACTION as unknown as number,
  REVERSE_SUBTRACTION: REVERSE_SUBTRACTION as unknown as number,
  DIFFERENCE: DIFFERENCE as unknown as number,
  INTERSECTION: INTERSECTION as unknown as number,
};

// ─── Position-convention bridge ───────────────────────────────────────────────
// Three.js primitive geometries are centered at their own origin. Our PlacedX
// position fields store the anchor (bottom-min corner for box, base centerline
// for cylinder, bottom contact point for sphere), so each Brush gets translated
// to the geometric center in world space before evaluation.

function brushFromBox(box: PlacedBox): Brush {
  const geo = new THREE.BoxGeometry(box.width, box.height, box.depth);
  const b = new Brush(geo);
  b.position.set(
    box.position.x + box.width / 2,
    box.position.y + box.height / 2,
    box.position.z + box.depth / 2,
  );
  b.updateMatrixWorld();
  return b;
}

function brushFromCylinder(cyl: PlacedCylinder): Brush {
  const geo = new THREE.CylinderGeometry(cyl.radius, cyl.radius, cyl.height, 32);
  const b = new Brush(geo);
  b.position.set(cyl.position.x, cyl.position.y + cyl.height / 2, cyl.position.z);
  b.updateMatrixWorld();
  return b;
}

function brushFromSphere(sph: PlacedSphere): Brush {
  const geo = new THREE.SphereGeometry(sph.radius, 32, 16);
  const b = new Brush(geo);
  b.position.set(sph.position.x, sph.position.y + sph.radius, sph.position.z);
  b.updateMatrixWorld();
  return b;
}

function brushFromMesh(mesh: PlacedMesh): Brush {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
  if (mesh.indices) geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  const b = new Brush(geo);
  b.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
  b.updateMatrixWorld();
  return b;
}

export function brushFrom(shape: AnyShape, kind: ShapeKind): Brush {
  switch (kind) {
    case "box":
      return brushFromBox(shape as PlacedBox);
    case "cylinder":
      return brushFromCylinder(shape as PlacedCylinder);
    case "sphere":
      return brushFromSphere(shape as PlacedSphere);
    case "mesh":
      return brushFromMesh(shape as PlacedMesh);
  }
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

export interface BooleanResult {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array | null;
}

// Convert the resulting Brush's geometry to plain typed-array buffers we can
// persist over the wire. The result geometry already encodes world-space
// vertices, so the PlacedMesh anchor stays at (0,0,0).
function geometryToResult(brush: Brush): BooleanResult {
  const geo = brush.geometry;
  const pos = geo.getAttribute("position");
  const nrm = geo.getAttribute("normal");
  if (!pos) {
    return {
      positions: new Float32Array(0),
      normals: new Float32Array(0),
      indices: null,
    };
  }
  // Materialize the array data so we own a stable Float32Array we can persist.
  const positions = new Float32Array(pos.array as Float32Array);
  const normals = nrm
    ? new Float32Array(nrm.array as Float32Array)
    : new Float32Array(positions.length);
  const idxAttr = geo.getIndex();
  const indices = idxAttr ? new Uint32Array(idxAttr.array as ArrayLike<number>) : null;
  return { positions, normals, indices };
}

const evaluator = new Evaluator();

export function evaluateBoolean(a: Brush, b: Brush, op: BooleanOperation): BooleanResult {
  const out = evaluator.evaluate(a, b, OP_MAP[op] as unknown as number);
  return geometryToResult(out);
}

// Helper: build the THREE.BufferGeometry for a PlacedMesh suitable for rendering.
export function geometryFromPlacedMesh(mesh: PlacedMesh): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
  if (mesh.indices) geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}
