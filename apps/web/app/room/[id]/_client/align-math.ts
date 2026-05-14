import { PlacedBox, PlacedCylinder, PlacedSphere } from "./types";

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

type Side = "min" | "max";
type Axes = { x: boolean; y: boolean; z: boolean };

export function computeAlignedPosition(
  source: Shape,
  sourceType: ShapeType,
  target: Shape,
  targetType: ShapeType,
  axes: Axes,
  sourceSide: Side,
  targetSide: Side,
): { x: number; y: number; z: number } {
  const srcAabb = aabbOf(source, sourceType);
  const tgtAabb = aabbOf(target, targetType);

  const result = {
    x: source.position.x,
    y: source.position.y,
    z: source.position.z,
  };

  for (const axis of ["x", "y", "z"] as const) {
    if (!axes[axis]) continue;
    const delta = tgtAabb[targetSide][axis] - srcAabb[sourceSide][axis];
    result[axis] = source.position[axis] + delta;
  }

  return result;
}
