// Wire format types for room objects - duplicated from server for client use

// Euler XYZ rotation in radians. Optional on the wire for backward compatibility
// with objects created before rotation support (treated as zero when absent).
export interface WireRotation {
  x: number;
  y: number;
  z: number;
}

export interface WireBox {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  rotation?: WireRotation;
  width: number;
  height: number;
  depth: number;
  color: string | null;
}

export interface WireCylinder {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  rotation?: WireRotation;
  radius: number;
  height: number;
  color: string | null;
}

export interface WireSphere {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  rotation?: WireRotation;
  radius: number;
  color: string | null;
}

export interface WireCone {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  rotation?: WireRotation;
  radius: number;
  height: number;
  color: string | null;
}

export interface WireMesh {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  rotation?: WireRotation;
  positions: string;        // base64(Float32Array.buffer)
  normals: string;          // base64(Float32Array.buffer)
  indices: string | null;   // base64(Uint32Array.buffer) or null
  color: string | null;
}

export type WireObject =
  | { type: "box"; data: WireBox }
  | { type: "cylinder"; data: WireCylinder }
  | { type: "sphere"; data: WireSphere }
  | { type: "cone"; data: WireCone }
  | { type: "mesh"; data: WireMesh };

export interface GetObjectsResponse {
  boxes: WireBox[];
  cylinders: WireCylinder[];
  spheres: WireSphere[];
  cones: WireCone[];
  meshes: WireMesh[];
}