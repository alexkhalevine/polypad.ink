"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type * as THREE from "three";

function WireframeCube() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshBasicMaterial wireframe color="#a855f7" />
    </mesh>
  );
}

export function RotatingCube() {
  return (
    <div className="w-48 h-48 pointer-events-none">
      <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
        <WireframeCube />
      </Canvas>
    </div>
  );
}
