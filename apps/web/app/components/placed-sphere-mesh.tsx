"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { PlacedSphere } from "@/app/room/[id]/_client/types";

interface PlacedSphereMeshProps {
  sphere: PlacedSphere;
  color?: string | null;
  isSelected?: boolean;
  isHovered?: boolean;
  wireframe?: boolean;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

const DEFAULT_COLOR = "#2f74c0";

export function PlacedSphereMesh({ sphere, color, isSelected, isHovered, wireframe, onClick, onPointerEnter, onPointerLeave }: PlacedSphereMeshProps) {
  const geo = useMemo(
    () => new THREE.SphereGeometry(sphere.radius, 32, 16),
    [sphere.radius]
  );

  return (
    <mesh
      geometry={geo}
      position={[sphere.center.x, sphere.center.y, sphere.center.z]}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <meshStandardMaterial color={color ?? DEFAULT_COLOR} wireframe={wireframe} />
    </mesh>
  );
}
