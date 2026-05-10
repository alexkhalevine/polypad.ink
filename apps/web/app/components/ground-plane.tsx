"use client";

import * as THREE from "three";
import { DrawPhase } from "@/app/room/[id]/_client/types";

interface GroundPlaneProps {
  phase: DrawPhase;
  toolActive: boolean;
  onStartDraw: (point: THREE.Vector3) => void;
  onPointerMove: (point: THREE.Vector3) => void;
  onClick: (point: THREE.Vector3) => void;
}

export function GroundPlane({
  phase,
  toolActive,
  onStartDraw,
  onPointerMove,
  onClick,
}: GroundPlaneProps) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      visible={false}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (phase === "footprint") onPointerMove(e.point);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (phase === "idle" && toolActive) onStartDraw(e.point);
        else if (phase === "footprint") onClick(e.point);
      }}
    >
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </mesh>
  );
}
