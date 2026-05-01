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

export type WireObject =
  | { type: "box"; data: WireBox }
  | { type: "cylinder"; data: WireCylinder }
  | { type: "sphere"; data: WireSphere };

export interface GetObjectsResponse {
  boxes: WireBox[];
  cylinders: WireCylinder[];
  spheres: WireSphere[];
}