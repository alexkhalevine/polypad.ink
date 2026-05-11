"use client";

import { DrawState } from "@/app/room/[id]/_client/types";

interface PreviewBoxProps {
  drawState: DrawState;
}

export function PreviewBox({ drawState }: PreviewBoxProps) {
  if (drawState.phase === "idle") return null;

  const { start, end } = drawState;
  const height =
    drawState.phase === "footprint" ? 0.05 : drawState.currentHeight;

  const width = Math.max(0.01, Math.abs(end.x - start.x));
  const depth = Math.max(0.01, Math.abs(end.z - start.z));
  const px = Math.min(start.x, end.x);
  const pz = Math.min(start.z, end.z);

  return (
    <group position={[px, 0, pz]}>
      <mesh position={[width / 2, height / 2, depth / 2]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#2f74c0"
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
