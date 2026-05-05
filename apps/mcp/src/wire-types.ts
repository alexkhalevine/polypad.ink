// Mirrored from apps/server/src/types.ts. This package keeps its own copy
// rather than importing from the server, matching the pattern used by the
// web client at apps/web/app/room/[id]/_client/queries/wire-types.ts.

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
