// Wire format types for room objects - duplicated from server for client use

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
  positions: string;        // base64(Float32Array.buffer)
  normals: string;          // base64(Float32Array.buffer)
  indices: string | null;   // base64(Uint32Array.buffer) or null
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