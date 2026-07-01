import { PlacedBox, PlacedCylinder, PlacedSphere, PlacedCone, AxisSide } from "./types";

export type Shape = PlacedBox | PlacedCylinder | PlacedSphere | PlacedCone;
export type ShapeType = "box" | "cylinder" | "sphere" | "cone";

interface AABB {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

// Position conventions (from types.ts):
//   Box:      position = bottom-min corner (min.x, 0, min.z)
//   Cylinder: position = base axis point (centerX, 0, centerZ)
//   Sphere:   position = bottom point on ground (centerX, 0, centerZ)
export function aabbOf(shape: Shape, type: ShapeType): AABB {
  const p = shape.position;

  if (type === "box") {
    const b = shape as PlacedBox;
    return {
      min: { x: p.x, y: p.y, z: p.z },
      max: { x: p.x + b.width, y: p.y + b.height, z: p.z + b.depth },
    };
  }

  if (type === "cylinder" || type === "cone") {
    const c = shape as PlacedCylinder | PlacedCone;
    return {
      min: { x: p.x - c.radius, y: p.y, z: p.z - c.radius },
      max: { x: p.x + c.radius, y: p.y + c.height, z: p.z + c.radius },
    };
  }

  // sphere
  const s = shape as PlacedSphere;
  return {
    min: { x: p.x - s.radius, y: p.y, z: p.z - s.radius },
    max: { x: p.x + s.radius, y: p.y + s.radius * 2, z: p.z + s.radius },
  };
}

function sideValue(aabb: AABB, axis: "x" | "y" | "z", side: "min" | "center" | "max"): number {
  if (side === "center") return (aabb.min[axis] + aabb.max[axis]) / 2;
  return aabb[side][axis];
}

// NOTE: Alignment is computed from axis-aligned bounding boxes and ignores object
// rotation. Aligning rotated objects may be inaccurate — a known follow-up for
// the rotate feature.
export function computeAlignedPosition(
  source: Shape,
  sourceType: ShapeType,
  target: Shape,
  targetType: ShapeType,
  alignX: AxisSide,
  alignY: AxisSide,
  alignZ: AxisSide,
): { x: number; y: number; z: number } {
  const srcAabb = aabbOf(source, sourceType);
  const tgtAabb = aabbOf(target, targetType);

  const result = {
    x: source.position.x,
    y: source.position.y,
    z: source.position.z,
  };

  const axes = [
    { axis: "x" as const, side: alignX },
    { axis: "y" as const, side: alignY },
    { axis: "z" as const, side: alignZ },
  ];

  for (const { axis, side } of axes) {
    if (side === null) continue;
    const delta = sideValue(tgtAabb, axis, side) - sideValue(srcAabb, axis, side);
    result[axis] = source.position[axis] + delta;
  }

  return result;
}

export interface DistributeItem {
  id: string;
  shape: Shape;
  type: ShapeType;
}

// Spaces 3+ shapes evenly along one axis: the two extreme shapes (by AABB
// center) stay fixed, interior shapes get equalized gaps between them. Returns
// only the moved (interior) ids — extremes are intentionally omitted.
export function computeDistributed(
  items: DistributeItem[],
  axis?: "x" | "y" | "z",
): Record<string, { x: number; y: number; z: number }> {
  if (items.length < 3) return {};

  const centers = items.map((item) => {
    const aabb = aabbOf(item.shape, item.type);
    return {
      x: (aabb.min.x + aabb.max.x) / 2,
      y: (aabb.min.y + aabb.max.y) / 2,
      z: (aabb.min.z + aabb.max.z) / 2,
    };
  });

  const spreadOf = (a: "x" | "y" | "z") =>
    Math.max(...centers.map((c) => c[a])) - Math.min(...centers.map((c) => c[a]));

  const spreadAxis: "x" | "y" | "z" =
    axis ?? (["x", "y", "z"] as const).reduce((best, a) => (spreadOf(a) > spreadOf(best) ? a : best), "x");

  const ordered = items
    .map((item, i) => ({ id: item.id, position: item.shape.position, center: centers[i][spreadAxis] }))
    .sort((a, b) => a.center - b.center);

  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const span = last.center - first.center;
  const gap = span / (ordered.length - 1);

  const result: Record<string, { x: number; y: number; z: number }> = {};
  for (let i = 1; i < ordered.length - 1; i++) {
    const entry = ordered[i];
    const target = first.center + gap * i;
    const delta = target - entry.center;
    result[entry.id] = {
      x: entry.position.x + (spreadAxis === "x" ? delta : 0),
      y: entry.position.y + (spreadAxis === "y" ? delta : 0),
      z: entry.position.z + (spreadAxis === "z" ? delta : 0),
    };
  }
  return result;
}
