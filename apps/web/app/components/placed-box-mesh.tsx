"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { PlacedBox } from "@/app/room/[id]/_client/types";

interface PlacedBoxMeshProps {
  box: PlacedBox;
  positionOverride?: { x: number; y: number; z: number };
  color?: string | null;
  isSelected?: boolean;
  isHovered?: boolean;
  wireframe?: boolean;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

const DEFAULT_COLOR = "#2f74c0";

export function PlacedBoxMesh({ box, positionOverride, color, isSelected, isHovered, wireframe, onClick, onPointerEnter, onPointerLeave }: PlacedBoxMeshProps) {
  const geo = useMemo(
    () => new THREE.BoxGeometry(box.width, box.height, box.depth),
    [box.width, box.height, box.depth]
  );

  const [x, y, z] = positionOverride
    ? [positionOverride.x, positionOverride.y, positionOverride.z]
    : [box.center.x, box.center.y, box.center.z];

  return (
    <group position={[x, y, z]}>
      <mesh geometry={geo} onClick={onClick} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
        <meshStandardMaterial color={color ?? DEFAULT_COLOR} wireframe={wireframe} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geo]} />
        <lineBasicMaterial color={isSelected || isHovered ? "#ffffff" : "#1a3a5c"} />
      </lineSegments>
    </group>
  );
}
