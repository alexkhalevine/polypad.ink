"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { PlacedCylinder } from "@/app/room/[id]/_client/types";

interface PlacedCylinderMeshProps {
  cylinder: PlacedCylinder;
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

export function PlacedCylinderMesh({ cylinder, positionOverride, color, isSelected, isHovered, wireframe, onClick, onPointerEnter, onPointerLeave }: PlacedCylinderMeshProps) {
  const geo = useMemo(
    () => new THREE.CylinderGeometry(cylinder.radius, cylinder.radius, cylinder.height, 32),
    [cylinder.radius, cylinder.height]
  );

  const [x, y, z] = positionOverride
    ? [positionOverride.x, positionOverride.y, positionOverride.z]
    : [cylinder.center.x, cylinder.center.y, cylinder.center.z];

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
