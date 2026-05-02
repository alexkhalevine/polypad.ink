import * as THREE from "three";

export type ToolType = "box" | "cylinder" | "sphere" | "move";
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
  center: THREE.Vector3;
  width: number;
  height: number;
  depth: number;
  color: string | null;
}

export interface PlacedCylinder {
  id: string;
  center: THREE.Vector3; // (centerX, height/2, centerZ) — sits on ground
  radius: number;
  height: number;
  color: string | null;
}

export interface PlacedSphere {
  id: string;
  center: THREE.Vector3; // (centerX, radius, centerZ) — sits on ground
  radius: number;
  color: string | null;
}
