"use client";

import * as THREE from "three";
import { DrawPhase } from "@/app/room/[id]/_client/types";

interface GroundPlaneProps {
  phase: DrawPhase;
  toolActive: boolean;
  // "draw" → idle-click starts a footprint, footprint-click confirms it (default).
  // "place" → any click while toolActive fires onClick (single-shot placement, e.g. clone).
  clickMode?: "draw" | "place";
  onStartDraw: (point: THREE.Vector3) => void;
  onPointerMove: (point: THREE.Vector3) => void;
  onClick: (point: THREE.Vector3) => void;
}

export function GroundPlane({
  phase,
  toolActive,
  clickMode = "draw",
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
        if (phase === "footprint" || (clickMode === "place" && toolActive)) {
          onPointerMove(e.point);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (clickMode === "place" && toolActive) onClick(e.point);
        else if (phase === "idle" && toolActive) onStartDraw(e.point);
        else if (phase === "footprint") onClick(e.point);
      }}
    >
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </mesh>
  );
}
