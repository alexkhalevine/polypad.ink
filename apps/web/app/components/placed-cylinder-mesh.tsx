"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { PlacedCylinder } from "@/app/room/[id]/_client/types";

export function PlacedCylinderMesh({ cylinder }: { cylinder: PlacedCylinder }) {
  const geo = useMemo(
    () => new THREE.CylinderGeometry(cylinder.radius, cylinder.radius, cylinder.height, 32),
    [cylinder.radius, cylinder.height]
  );

  return (
    <group position={[cylinder.center.x, cylinder.center.y, cylinder.center.z]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#2f74c0" />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geo]} />
        <lineBasicMaterial color="#1a3a5c" />
      </lineSegments>
    </group>
  );
}
