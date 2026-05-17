"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import type { BooleanOperation } from "./types";
import { brushFrom, evaluateBoolean, type AnyShape, type ShapeKind } from "./csg-utils";

interface BooleanThumbnailProps {
  source: AnyShape;
  sourceKind: ShapeKind;
  target: AnyShape;
  targetKind: ShapeKind;
  op: BooleanOperation;
  color: string;
}

// Tiny 3D thumbnail of one boolean operation result. Used inside the panel's
// 5-button operation picker. The canvas is fixed-size and uses an orthographic
// camera framed around the combined bounding box so the result is always centered.
export function BooleanThumbnail({
  source,
  sourceKind,
  target,
  targetKind,
  op,
  color,
}: BooleanThumbnailProps) {
  const result = useMemo(() => {
    try {
      const a = brushFrom(source, sourceKind);
      const b = brushFrom(target, targetKind);
      return evaluateBoolean(a, b, op);
    } catch {
      return null;
    }
  }, [source, sourceKind, target, targetKind, op]);

  const { geometry, frameSize, center } = useMemo(() => {
    if (!result || result.positions.length === 0) {
      return { geometry: null, frameSize: 1, center: new THREE.Vector3() };
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(result.positions, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(result.normals, 3));
    if (result.indices) geo.setIndex(new THREE.BufferAttribute(result.indices, 1));
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const size = new THREE.Vector3();
    bb.getSize(size);
    const c = new THREE.Vector3();
    bb.getCenter(c);
    return { geometry: geo, frameSize: Math.max(size.x, size.y, size.z, 0.5) * 1.2, center: c };
  }, [result]);

  // Re-centering the mesh at origin keeps the camera setup trivial — it always
  // looks at (0,0,0). The wrapping <group> applies a negative center translation.
  return (
    <div className="w-full h-12 bg-indigo-950 rounded-sm overflow-hidden">
      <Canvas
        orthographic
        camera={{
          position: [frameSize, frameSize, frameSize],
          zoom: 18 / frameSize,
          up: [0, 1, 0],
          near: 0.01,
          far: 1000,
        }}
      >
        <ambientLight intensity={Math.PI / 2} />
        <directionalLight position={[5, 5, 5]} intensity={Math.PI / 2} />
        {geometry && (
          <group position={[-center.x, -center.y, -center.z]}>
            <mesh geometry={geometry}>
              <meshStandardMaterial color={color} />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[geometry]} />
              <lineBasicMaterial color="#ffffff" opacity={0.4} transparent />
            </lineSegments>
          </group>
        )}
      </Canvas>
    </div>
  );
}
