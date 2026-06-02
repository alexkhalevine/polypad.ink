import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { computeCentroid, geometryFromPlacedMesh } from "./csg-utils";
import type { PlacedBox, PlacedCylinder, PlacedMesh } from "./types";

// Real (Blender-style) face extrude: duplicate a planar face, push the copy along
// the face normal, and stitch side walls between the old rim and the new position.
// Everything is computed in WORLD space; the final mesh is re-centered like CSG
// results so PlacedMesh.position = centroid.

export type ExtrudableObject = PlacedBox | PlacedCylinder | PlacedMesh;
export type ExtrudableType = "box" | "cylinder" | "mesh";

export interface FaceGroup {
  triIndices: number[]; // triangle ids (triangle t spans index entries [3t, 3t+2])
  boundaryLoop: [number, number][]; // directed boundary edges (a→b) in owning-tri winding
  vertexIndices: number[]; // unique vertex ids touched by the group
  centroid: THREE.Vector3; // average of group vertices (world)
  normal: THREE.Vector3; // outward face normal (world, unit)
}

export interface ExtrudeResult {
  positions: Float32Array; // centered at centroid
  normals: Float32Array;
  indices: Uint32Array | null;
  edges: Float32Array | null; // polygon-edge segments, centered at centroid
  centroid: THREE.Vector3;
}

// ─── 1. World-space geometry from any extrudable object ─────────────────────────

export function buildWorldGeometry(
  obj: ExtrudableObject,
  type: ExtrudableType,
): THREE.BufferGeometry {
  if (type === "box") {
    const b = obj as PlacedBox;
    const g = new THREE.BoxGeometry(b.width, b.height, b.depth);
    g.translate(b.position.x + b.width / 2, b.position.y + b.height / 2, b.position.z + b.depth / 2);
    return g;
  }
  if (type === "cylinder") {
    const c = obj as PlacedCylinder;
    const g = new THREE.CylinderGeometry(c.radius, c.radius, c.height, 32);
    g.translate(c.position.x, c.position.y + c.height / 2, c.position.z);
    return g;
  }
  const m = obj as PlacedMesh;
  const g = geometryFromPlacedMesh(m);
  g.translate(m.position.x, m.position.y, m.position.z);
  return g;
}

// ─── 2. Weld by position only → indexed manifold (shared-edge adjacency) ────────

export function weldByPosition(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geo.getAttribute("position");
  const stripped = new THREE.BufferGeometry();
  stripped.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(pos.array as ArrayLike<number>), 3),
  );
  const srcIdx = geo.getIndex();
  if (srcIdx) {
    stripped.setIndex(Array.from(srcIdx.array as ArrayLike<number>));
  }
  // mergeVertices welds purely by position because no other attributes remain,
  // and always returns an indexed geometry.
  return mergeVertices(stripped, 1e-4);
}

// ─── 3. Flood-fill the connected coplanar face containing the hit point ─────────

export function selectCoplanarFaceGroup(
  geo: THREE.BufferGeometry,
  normal: { x: number; y: number; z: number },
  point: { x: number; y: number; z: number },
): FaceGroup {
  const index = geo.getIndex();
  const pos = geo.getAttribute("position");
  if (!index) throw new Error("selectCoplanarFaceGroup requires an indexed geometry");
  const idx = index.array;
  const triCount = index.count / 3;

  const n = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
  const p = new THREE.Vector3(point.x, point.y, point.z);
  const planeD = n.dot(p);
  const NEPS = 1e-3;
  const PEPS = 1e-3;

  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  function triNormal(t: number, out: THREE.Vector3): THREE.Vector3 {
    va.fromBufferAttribute(pos, idx[t * 3]);
    vb.fromBufferAttribute(pos, idx[t * 3 + 1]);
    vc.fromBufferAttribute(pos, idx[t * 3 + 2]);
    ab.subVectors(vb, va);
    ac.subVectors(vc, va);
    return out.crossVectors(ab, ac).normalize();
  }
  function triCoplanar(t: number): boolean {
    const tn = triNormal(t, new THREE.Vector3());
    if (tn.dot(n) <= 1 - NEPS) return false;
    for (let k = 0; k < 3; k++) {
      va.fromBufferAttribute(pos, idx[t * 3 + k]);
      if (Math.abs(n.dot(va) - planeD) > PEPS) return false;
    }
    return true;
  }

  // Candidate triangles: coplanar with the picked face plane and facing the same way.
  const candidates: number[] = [];
  for (let t = 0; t < triCount; t++) if (triCoplanar(t)) candidates.push(t);
  if (candidates.length === 0) {
    return { triIndices: [], boundaryLoop: [], vertexIndices: [], centroid: p.clone(), normal: n };
  }

  // Seed = candidate whose centroid is closest to the hit point.
  let seed = candidates[0];
  let bestDist = Infinity;
  const tc = new THREE.Vector3();
  for (const t of candidates) {
    va.fromBufferAttribute(pos, idx[t * 3]);
    vb.fromBufferAttribute(pos, idx[t * 3 + 1]);
    vc.fromBufferAttribute(pos, idx[t * 3 + 2]);
    tc.copy(va).add(vb).add(vc).multiplyScalar(1 / 3);
    const d = tc.distanceToSquared(p);
    if (d < bestDist) {
      bestDist = d;
      seed = t;
    }
  }

  // Edge → candidate triangles, for adjacency flood fill.
  const candidateSet = new Set(candidates);
  const edgeKey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const edgeToTris = new Map<string, number[]>();
  for (const t of candidates) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    for (const [u, w] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      const key = edgeKey(u, w);
      const arr = edgeToTris.get(key);
      if (arr) arr.push(t); else edgeToTris.set(key, [t]);
    }
  }

  // BFS across shared edges within candidates.
  const group = new Set<number>();
  const stack = [seed];
  group.add(seed);
  while (stack.length) {
    const t = stack.pop()!;
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    for (const [u, w] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      for (const nb of edgeToTris.get(edgeKey(u, w)) ?? []) {
        if (nb !== t && candidateSet.has(nb) && !group.has(nb)) {
          group.add(nb);
          stack.push(nb);
        }
      }
    }
  }

  const triIndices = [...group];

  // Boundary = undirected edges used by exactly one group triangle; keep directed.
  const undirectedCount = new Map<string, number>();
  const directed: [number, number][] = [];
  for (const t of triIndices) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    for (const [u, w] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      const key = edgeKey(u, w);
      undirectedCount.set(key, (undirectedCount.get(key) ?? 0) + 1);
      directed.push([u, w]);
    }
  }
  const boundaryLoop = directed.filter(([u, w]) => undirectedCount.get(edgeKey(u, w)) === 1);

  // Unique vertices + centroid.
  const vset = new Set<number>();
  for (const t of triIndices) {
    vset.add(idx[t * 3]);
    vset.add(idx[t * 3 + 1]);
    vset.add(idx[t * 3 + 2]);
  }
  const vertexIndices = [...vset];
  const centroid = new THREE.Vector3();
  for (const vi of vertexIndices) {
    va.fromBufferAttribute(pos, vi);
    centroid.add(va);
  }
  if (vertexIndices.length) centroid.multiplyScalar(1 / vertexIndices.length);

  return { triIndices, boundaryLoop, vertexIndices, centroid, normal: n };
}

// ─── 4. Extrude: move the face along the normal, bridge the boundary ────────────

export function extrudeFaceGroup(
  geo: THREE.BufferGeometry,
  group: FaceGroup,
  normal: { x: number; y: number; z: number },
  distance: number,
): THREE.BufferGeometry {
  const srcPos = geo.getAttribute("position");
  const srcIdx = geo.getIndex();
  if (!srcIdx) throw new Error("extrudeFaceGroup requires an indexed geometry");
  const ai = srcIdx.array;
  const triCount = srcIdx.count / 3;

  const positions: number[] = Array.from(srcPos.array as ArrayLike<number>);
  const offset = new THREE.Vector3(normal.x, normal.y, normal.z).normalize().multiplyScalar(distance);

  // Offset copy per group vertex.
  const newIndexOf = new Map<number, number>();
  const v = new THREE.Vector3();
  for (const vi of group.vertexIndices) {
    v.fromBufferAttribute(srcPos, vi).add(offset);
    const ni = positions.length / 3;
    positions.push(v.x, v.y, v.z);
    newIndexOf.set(vi, ni);
  }

  const groupSet = new Set(group.triIndices);
  const out: number[] = [];
  for (let t = 0; t < triCount; t++) {
    const a = ai[t * 3], b = ai[t * 3 + 1], c = ai[t * 3 + 2];
    if (groupSet.has(t)) {
      out.push(newIndexOf.get(a)!, newIndexOf.get(b)!, newIndexOf.get(c)!);
    } else {
      out.push(a, b, c);
    }
  }

  // Side walls. For an outward-CCW boundary edge (a→b), the quad (a, b, b', a')
  // wound as (a,b,b') + (a,b',a') has an outward-facing normal (verified for
  // distance > 0).
  for (const [a, b] of group.boundaryLoop) {
    const a2 = newIndexOf.get(a)!;
    const b2 = newIndexOf.get(b)!;
    out.push(a, b, b2);
    out.push(a, b2, a2);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(out);
  return g;
}

// ─── 5. Polygon-edge tracking (Blender-style construction edges) ────────────────

const KEY_PRECISION = 1e4;
const keyOf = (x: number, y: number, z: number) =>
  `${Math.round(x * KEY_PRECISION)}_${Math.round(y * KEY_PRECISION)}_${Math.round(z * KEY_PRECISION)}`;

// Feature edges (sharp dihedral + boundary) of a geometry, as a flat segment buffer.
// Used as the source edge set for the first extrude of a primitive.
export function featureEdges(geo: THREE.BufferGeometry): Float32Array {
  const eg = new THREE.EdgesGeometry(geo, 1);
  const pos = eg.getAttribute("position");
  return new Float32Array(pos.array as ArrayLike<number>);
}

// Build the result's polygon-edge set (world space) by transforming the source edges
// and adding the construction edges the extrude creates. Unlike EdgesGeometry, this
// keeps the original face rim loop (the flat "seam"), so it stays visible.
export function buildExtrudeEdges(
  base: THREE.BufferGeometry,
  group: FaceGroup,
  normal: { x: number; y: number; z: number },
  distance: number,
  sourceEdges: Float32Array,
): Float32Array {
  const basePos = base.getAttribute("position");
  const n = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
  const off = n.clone().multiplyScalar(distance);

  // Positions of the moving face's vertices, so we can tell which source-edge
  // endpoints ride along with the face.
  const movedKeys = new Set<string>();
  const v = new THREE.Vector3();
  for (const vi of group.vertexIndices) {
    v.fromBufferAttribute(basePos, vi);
    movedKeys.add(keyOf(v.x, v.y, v.z));
  }

  const out: number[] = [];
  // 1. Source edges, with endpoints on the moving face translated by the offset.
  for (let i = 0; i + 5 < sourceEdges.length; i += 6) {
    const ax = sourceEdges[i], ay = sourceEdges[i + 1], az = sourceEdges[i + 2];
    const bx = sourceEdges[i + 3], by = sourceEdges[i + 4], bz = sourceEdges[i + 5];
    const am = movedKeys.has(keyOf(ax, ay, az));
    const bm = movedKeys.has(keyOf(bx, by, bz));
    out.push(
      ax + (am ? off.x : 0), ay + (am ? off.y : 0), az + (am ? off.z : 0),
      bx + (bm ? off.x : 0), by + (bm ? off.y : 0), bz + (bm ? off.z : 0),
    );
  }

  // 2. Rim loop at the ORIGINAL position — the extrude seam EdgesGeometry would hide.
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  for (const [a, b] of group.boundaryLoop) {
    va.fromBufferAttribute(basePos, a);
    vb.fromBufferAttribute(basePos, b);
    out.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
  }

  // 3. Wall verticals at each boundary vertex (original → offset).
  const boundaryVerts = new Set<number>();
  for (const [a, b] of group.boundaryLoop) {
    boundaryVerts.add(a);
    boundaryVerts.add(b);
  }
  for (const vi of boundaryVerts) {
    va.fromBufferAttribute(basePos, vi);
    out.push(va.x, va.y, va.z, va.x + off.x, va.y + off.y, va.z + off.z);
  }

  return new Float32Array(out);
}

// ─── 6. Flat-shade + re-center for persistence ──────────────────────────────────

export function finalizeExtruded(
  worldGeo: THREE.BufferGeometry,
  worldEdges?: Float32Array | null,
): ExtrudeResult {
  const flat = worldGeo.toNonIndexed();
  flat.computeVertexNormals();
  const posAttr = flat.getAttribute("position");
  const nrmAttr = flat.getAttribute("normal");
  const worldPositions = new Float32Array(posAttr.array as ArrayLike<number>);
  const normals = new Float32Array(nrmAttr.array as ArrayLike<number>);
  const centroid = computeCentroid(worldPositions);
  const positions = new Float32Array(worldPositions.length);
  for (let i = 0; i < worldPositions.length; i += 3) {
    positions[i] = worldPositions[i] - centroid.x;
    positions[i + 1] = worldPositions[i + 1] - centroid.y;
    positions[i + 2] = worldPositions[i + 2] - centroid.z;
  }

  let edges: Float32Array | null = null;
  if (worldEdges && worldEdges.length > 0) {
    edges = new Float32Array(worldEdges.length);
    for (let i = 0; i < worldEdges.length; i += 3) {
      edges[i] = worldEdges[i] - centroid.x;
      edges[i + 1] = worldEdges[i + 1] - centroid.y;
      edges[i + 2] = worldEdges[i + 2] - centroid.z;
    }
  }

  return { positions, normals, indices: null, edges, centroid };
}

// Convenience for the preview: produce a flat-shaded, renderable world geometry for
// a given extrusion distance (distance ≈ 0 → the un-extruded base, flat-shaded).
export function previewGeometry(
  base: THREE.BufferGeometry,
  group: FaceGroup,
  normal: { x: number; y: number; z: number },
  distance: number,
): THREE.BufferGeometry {
  const world = distance > 1e-4 ? extrudeFaceGroup(base, group, normal, distance) : base.clone();
  const flat = world.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}
