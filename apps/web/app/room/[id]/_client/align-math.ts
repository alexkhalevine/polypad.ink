import { PlacedBox, PlacedCylinder, PlacedSphere, AxisSide } from "./types";

type Shape = PlacedBox | PlacedCylinder | PlacedSphere;
type ShapeType = "box" | "cylinder" | "sphere";

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

  if (type === "cylinder") {
    const c = shape as PlacedCylinder;
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
