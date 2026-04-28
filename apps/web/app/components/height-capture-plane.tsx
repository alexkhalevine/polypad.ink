"use client";

import * as THREE from "three";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

interface HeightCapturePlaneProps {
  active: boolean;
  anchorX: number;
  anchorZ: number;
  onPointerMove: (worldY: number) => void;
  onClick: (worldY: number) => void;
}

export function HeightCapturePlane({
  active,
  anchorX,
  anchorZ,
  onPointerMove,
  onClick,
}: HeightCapturePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { camera } = useThree();

  useFrame(() => {
    if (meshRef.current && active) {
      meshRef.current.lookAt(camera.position);
    }
  });

  if (!active) return null;

  return (
    <mesh
      ref={meshRef}
      position={[anchorX, 0, anchorZ]}
      visible={false}
      onPointerMove={(e) => {
        e.stopPropagation();
        onPointerMove(e.point.y);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e.point.y);
      }}
    >
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </mesh>
  );
}
