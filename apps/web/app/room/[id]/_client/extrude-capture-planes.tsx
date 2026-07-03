"use client";

import * as THREE from "three";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { FaceKey } from "./types";
import { faceAxis } from "./mate-math";

type Vec3 = { x: number; y: number; z: number };

// Plane geometry's default normal is +z; rotate it to match the face axis.
// DoubleSide material means the sign of the normal doesn't matter for raycasts.
function rotationForAxis(faceKey: FaceKey): [number, number, number] {
  const axis = faceAxis(faceKey);
  if (axis === "x") return [0, Math.PI / 2, 0];
  if (axis === "y") return [Math.PI / 2, 0, 0];
  return [0, 0, 0];
}

// Invisible plane coincident with the picked face, so rect-drawing keeps
// receiving pointer events even when the cursor drifts off the box itself
// (mirrors GroundPlane, but oriented/positioned at an arbitrary box face).
export function FacePlaneCapture({
  active,
  faceKey,
  faceCenter,
  onPointerMove,
  onClick,
}: {
  active: boolean;
  faceKey: FaceKey;
  faceCenter: Vec3;
  onPointerMove: (point: THREE.Vector3) => void;
  onClick: (point: THREE.Vector3) => void;
}) {
  if (!active) return null;

  return (
    <mesh
      position={[faceCenter.x, faceCenter.y, faceCenter.z]}
      rotation={rotationForAxis(faceKey)}
      visible={false}
      onPointerMove={(e) => {
        e.stopPropagation();
        onPointerMove(e.point);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e.point);
      }}
    >
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </mesh>
  );
}

// Billboarded capture plane anchored at the sketched rect's center: the caller
// projects the returned world point onto the face normal to get the extrude
// depth (mirrors HeightCapturePlane, generalized beyond the Y axis).
export function NormalDepthCapture({
  active,
  anchor,
  onPointerMove,
  onClick,
}: {
  active: boolean;
  anchor: Vec3;
  onPointerMove: (point: THREE.Vector3) => void;
  onClick: (point: THREE.Vector3) => void;
}) {
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
      position={[anchor.x, anchor.y, anchor.z]}
      visible={false}
      onPointerMove={(e) => {
        e.stopPropagation();
        onPointerMove(e.point);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e.point);
      }}
    >
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </mesh>
  );
}
