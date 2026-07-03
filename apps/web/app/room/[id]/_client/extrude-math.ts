import { FaceKey } from "./types";
import { aabbOf } from "./align-math";
import { faceAxis, faceSign } from "./mate-math";

type AABB = ReturnType<typeof aabbOf>;
type Axis = "x" | "y" | "z";
type Vec3 = { x: number; y: number; z: number };

// Smallest committable rect edge / extrusion depth, matching the 0.01 floor
// used by the draw hooks and dimension inputs.
export const MIN_EXTRUDE_SIZE = 0.01;

// How far the CSG tool box overshoots past the sketch face. Perfectly coplanar
// faces are a classic CSG failure mode (three-bvh-csg included), so the tool box
// always extends slightly beyond the face plane on the non-result side: into
// the base for a union, out of it for a subtraction.
export const FACE_OVERSHOOT = 0.001;

export function inPlaneAxes(faceKey: FaceKey): [Axis, Axis] {
  const axis = faceAxis(faceKey);
  return (["x", "y", "z"] as const).filter((a) => a !== axis) as [Axis, Axis];
}

function facePlane(aabb: AABB, faceKey: FaceKey): number {
  const axis = faceAxis(faceKey);
  return faceSign(faceKey) === 1 ? aabb.max[axis] : aabb.min[axis];
}

// Projects an arbitrary world point onto the face plane and clamps it inside
// the face rectangle, so rect corners can never leave the sketched face.
export function clampPointToFace(point: Vec3, aabb: AABB, faceKey: FaceKey): Vec3 {
  const axis = faceAxis(faceKey);
  const result: Vec3 = { ...point };
  result[axis] = facePlane(aabb, faceKey);
  for (const a of inPlaneAxes(faceKey)) {
    result[a] = Math.min(aabb.max[a], Math.max(aabb.min[a], point[a]));
  }
  return result;
}

// Signed distance of a world point from the face plane along the outward
// normal: positive = outside the box (extrude out), negative = inside (cut in).
export function depthFromPoint(point: Vec3, aabb: AABB, faceKey: FaceKey): number {
  const axis = faceAxis(faceKey);
  return (point[axis] - facePlane(aabb, faceKey)) * faceSign(faceKey);
}

export interface ExtrusionBox {
  position: Vec3; // bottom-min corner, PlacedBox convention
  width: number;
  height: number;
  depth: number;
}

// Computes the CSG "tool" box for a sketched rect + signed depth. Returns null
// when the rect or depth is degenerate. The caller unions the result with the
// base box (depth > 0) or subtracts it (depth < 0).
export function computeExtrusionBox(
  aabb: AABB,
  faceKey: FaceKey,
  rectStart: Vec3,
  rectEnd: Vec3,
  depth: number,
): ExtrusionBox | null {
  if (Math.abs(depth) < MIN_EXTRUDE_SIZE) return null;

  const axis = faceAxis(faceKey);
  const sign = faceSign(faceKey);
  const plane = facePlane(aabb, faceKey);
  const [u, v] = inPlaneAxes(faceKey);

  const start = clampPointToFace(rectStart, aabb, faceKey);
  const end = clampPointToFace(rectEnd, aabb, faceKey);

  const uMin = Math.min(start[u], end[u]);
  const uMax = Math.max(start[u], end[u]);
  const vMin = Math.min(start[v], end[v]);
  const vMax = Math.max(start[v], end[v]);
  if (uMax - uMin < MIN_EXTRUDE_SIZE || vMax - vMin < MIN_EXTRUDE_SIZE) return null;

  // Along the normal: [face plane ± overshoot, face plane + signed reach].
  // Union overshoots into the base so the two solids overlap; subtraction
  // overshoots outward so the cut opening isn't a coplanar face.
  const overshoot = depth > 0 ? plane - sign * FACE_OVERSHOOT : plane + sign * FACE_OVERSHOOT;
  const reach = plane + sign * depth;
  const nMin = Math.min(overshoot, reach);
  const nMax = Math.max(overshoot, reach);

  const min: Vec3 = { x: 0, y: 0, z: 0 };
  const size: Vec3 = { x: 0, y: 0, z: 0 };
  min[u] = uMin;
  min[v] = vMin;
  min[axis] = nMin;
  size[u] = uMax - uMin;
  size[v] = vMax - vMin;
  size[axis] = nMax - nMin;

  return {
    position: min,
    width: size.x,
    height: size.y,
    depth: size.z,
  };
}
