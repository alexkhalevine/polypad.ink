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
  const cx = (start.x + end.x) / 2;
  const cz = (start.z + end.z) / 2;
  const cy = height / 2;

  return (
    <mesh position={[cx, cy, cz]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color="#2f74c0"
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  );
}
