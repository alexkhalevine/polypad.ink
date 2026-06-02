import * as THREE from "three";

export type ToolType = "box" | "cylinder" | "sphere" | "move" | "align" | "boolean" | "clone" | "extrude";
export type AxisSide = "min" | "center" | "max" | null;

// A picked face, described by its world-space normal and a point lying on it.
// Works for any object (box/cylinder cap/arbitrary planar mesh face) because the
// actual face triangles are resolved from the geometry at extrude time.
export interface ExtrudeFace {
  normal: { x: number; y: number; z: number };
  point: { x: number; y: number; z: number };
}

export type BooleanOperation =
  | "ADDITION"
  | "SUBTRACTION"
  | "REVERSE_SUBTRACTION"
  | "DIFFERENCE"
  | "INTERSECTION";
export type DrawPhase = "idle" | "footprint" | "height";

export interface IdleState {
  phase: "idle";
}

export interface FootprintState {
  phase: "footprint";
  start: THREE.Vector3;
  end: THREE.Vector3;
}

export interface HeightState {
  phase: "height";
  start: THREE.Vector3;
  end: THREE.Vector3;
  currentHeight: number;
}

export type DrawState = IdleState | FootprintState | HeightState;

export interface PlacedBox {
  id: string;
  // Bottom-min corner of the footprint at ground level: (min(start.x,end.x), 0, min(start.z,end.z))
  position: THREE.Vector3;
  width: number;
  height: number;
  depth: number;
  color: string | null;
}

export interface PlacedCylinder {
  id: string;
  // Base of the cylinder (axis point at ground level): (centerX, 0, centerZ)
  position: THREE.Vector3;
  radius: number;
  height: number;
  color: string | null;
}

export interface PlacedSphere {
  id: string;
  // Bottom point of the sphere on the ground: (centerX, 0, centerZ)
  position: THREE.Vector3;
  radius: number;
  color: string | null;
}

export interface PlacedMesh {
  id: string;
  // Anchor offset for the baked BufferGeometry. The geometry already lives in world
  // space when produced by a boolean op, so `position` is typically (0,0,0).
  position: THREE.Vector3;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array | null;
  // Polygon-edge segment endpoints ([ax,ay,az, bx,by,bz, …]) centered like `positions`.
  // Rendered as LineSegments so flat construction edges (e.g. an extrude seam) stay
  // visible; null falls back to THREE.EdgesGeometry (feature edges only).
  edges: Float32Array | null;
  color: string | null;
}

export interface RemoteUserPresence {
  displayName: string;
  cursor: { x: number; y: number; z: number } | null;
  selectedObjectId: string | null;
}
