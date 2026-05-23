// Wire format types for room objects - duplicated from web for server use

export interface WireBox {
  id: string;
  cx: number;
  cy: number;
  cz: number;
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
  radius: number;
  height: number;
  color: string | null;
}

export interface WireSphere {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  radius: number;
  color: string | null;
}

export interface WireMesh {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  // Base64-encoded raw buffers for the BufferGeometry attributes.
  positions: string;        // Float32Array
  normals: string;          // Float32Array
  indices: string | null;   // Uint32Array, or null for non-indexed
  color: string | null;
}

export type WireObject =
  | { type: "box"; data: WireBox }
  | { type: "cylinder"; data: WireCylinder }
  | { type: "sphere"; data: WireSphere }
  | { type: "mesh"; data: WireMesh };

export interface GetObjectsResponse {
  boxes: WireBox[];
  cylinders: WireCylinder[];
  spheres: WireSphere[];
  meshes: WireMesh[];
}