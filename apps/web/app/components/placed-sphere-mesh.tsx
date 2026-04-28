"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { PlacedSphere } from "@/app/room/[id]/_client/types";

export function PlacedSphereMesh({ sphere }: { sphere: PlacedSphere }) {
  const geo = useMemo(
    () => new THREE.SphereGeometry(sphere.radius, 32, 16),
    [sphere.radius]
  );

  return (
    <mesh
      geometry={geo}
      position={[sphere.center.x, sphere.center.y, sphere.center.z]}
    >
      <meshStandardMaterial color="#2f74c0" />
    </mesh>
  );
}
