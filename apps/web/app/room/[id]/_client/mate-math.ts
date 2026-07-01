import { FaceKey, MateMode } from "./types";
import { aabbOf, Shape, ShapeType } from "./align-math";

type Axis = "x" | "y" | "z";

export function faceAxis(key: FaceKey): Axis {
  return key[1] as Axis;
}

export function faceSign(key: FaceKey): 1 | -1 {
  return key[0] === "+" ? 1 : -1;
}

function facePlaneValue(aabb: ReturnType<typeof aabbOf>, axis: Axis, sign: 1 | -1): number {
  return sign === 1 ? aabb.max[axis] : aabb.min[axis];
}

// Rectangle (in the two in-plane axes) a face spans on an AABB — used by both
// the overlay highlight and the Center mate mode.
export function faceRect(
  aabb: ReturnType<typeof aabbOf>,
  faceKey: FaceKey,
): { axis: Axis; plane: number; inPlaneAxes: [Axis, Axis]; center: { x: number; y: number; z: number } } {
  const axis = faceAxis(faceKey);
  const sign = faceSign(faceKey);
  const plane = facePlaneValue(aabb, axis, sign);
  const inPlaneAxes = (["x", "y", "z"] as const).filter((a) => a !== axis) as [Axis, Axis];
  const center = {
    x: axis === "x" ? plane : (aabb.min.x + aabb.max.x) / 2,
    y: axis === "y" ? plane : (aabb.min.y + aabb.max.y) / 2,
    z: axis === "z" ? plane : (aabb.min.z + aabb.max.z) / 2,
  };
  return { axis, plane, inPlaneAxes, center };
}

// Translation-only mate (v1; rotation is a noted v2 stretch). Moves `source` so
// its picked face becomes coincident with the target's picked face along the
// target face's world-normal axis, then applies the mode:
//   Flush  — faces touch.
//   Gap    — flush, offset further out along the target's outward normal.
//   Center — flush, plus the source face's in-plane extent is centered on the
//            target face's rect.
export function computeMatePosition(
  source: Shape,
  sourceType: ShapeType,
  sourceFaceKey: FaceKey,
  target: Shape,
  targetType: ShapeType,
  targetFaceKey: FaceKey,
  mode: MateMode,
  offset: number,
): { x: number; y: number; z: number } {
  const srcAabb = aabbOf(source, sourceType);
  const tgtAabb = aabbOf(target, targetType);

  const axis = faceAxis(targetFaceKey);
  const targetSign = faceSign(targetFaceKey);
  const targetPlane = facePlaneValue(tgtAabb, axis, targetSign);

  // The source's contact plane lives on the same axis as the target face. If
  // the user picked a source face on a different axis (an unusual but
  // permitted combination), fall back to the source side directly facing the
  // target along the mate axis.
  const sourceSign: 1 | -1 = faceAxis(sourceFaceKey) === axis ? faceSign(sourceFaceKey) : ((-targetSign) as 1 | -1);
  const sourcePlane = facePlaneValue(srcAabb, axis, sourceSign);

  let delta = targetPlane - sourcePlane;
  if (mode === "gap") delta += targetSign * offset;

  const result = {
    x: source.position.x,
    y: source.position.y,
    z: source.position.z,
  };
  result[axis] += delta;

  if (mode === "center") {
    const inPlaneAxes = (["x", "y", "z"] as const).filter((a) => a !== axis);
    for (const a of inPlaneAxes) {
      const targetCenter = (tgtAabb.min[a] + tgtAabb.max[a]) / 2;
      const sourceCenter = (srcAabb.min[a] + srcAabb.max[a]) / 2;
      result[a] += targetCenter - sourceCenter;
    }
  }

  return result;
}
