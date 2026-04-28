"use client";

import * as THREE from "three";
import { DrawState } from "@/app/room/[id]/_client/types";

function xzDist(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.max(0.01, Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2));
}

export function PreviewSphere({ drawState }: { drawState: DrawState }) {
  if (drawState.phase === "idle") return null;

  const { start, end } = drawState;
  const radius = xzDist(start, end);

  return (
    <mesh position={[start.x, radius, start.z]}>
      <sphereGeometry args={[radius, 32, 16]} />
      <meshStandardMaterial
        color="#2f74c0"
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  );
}
