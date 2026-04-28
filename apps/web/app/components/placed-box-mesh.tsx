"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { PlacedBox } from "@/app/room/[id]/_client/types";

interface PlacedBoxMeshProps {
  box: PlacedBox;
}

export function PlacedBoxMesh({ box }: PlacedBoxMeshProps) {
  const geo = useMemo(
    () => new THREE.BoxGeometry(box.width, box.height, box.depth),
    [box.width, box.height, box.depth]
  );

  return (
    <group position={[box.center.x, box.center.y, box.center.z]}>
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
