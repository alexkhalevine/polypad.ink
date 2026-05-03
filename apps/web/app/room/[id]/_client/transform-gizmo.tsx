"use client";

import * as THREE from "three";
import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import { PlacedBox, PlacedCylinder, PlacedSphere } from "./types";

interface TransformGizmoProps {
  selectedObjectId: string | null;
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  onObjectMove?: (objectId: string, newPosition: THREE.Vector3, persist: boolean) => void;
}

export function TransformGizmo({
  selectedObjectId,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  onObjectMove,
}: TransformGizmoProps) {
  const { camera, gl } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformRef = useRef<any>(null);

  const allObjects = [
    ...placedBoxes.map((b) => ({ id: b.id, center: b.center })),
    ...placedCylinders.map((c) => ({ id: c.id, center: c.center })),
    ...placedSpheres.map((s) => ({ id: s.id, center: s.center })),
  ];

  const selected = selectedObjectId
    ? allObjects.find((o) => o.id === selectedObjectId)
    : null;

  const handleChange = () => {
    if (!transformRef.current || !selectedObjectId || !onObjectMove) return;
    const pos = transformRef.current.object?.position;
    if (pos) {
      pos.y = Math.max(0, pos.y);
      onObjectMove(selectedObjectId, pos.clone(), false);
    }
  };

  const handleMouseUp = () => {
    if (!transformRef.current || !selectedObjectId || !onObjectMove) return;
    const pos = transformRef.current.object?.position;
    if (pos) {
      pos.y = Math.max(0, pos.y);
      onObjectMove(selectedObjectId, pos.clone(), true);
    }
  };

  if (!selected) return null;

  return (
    <TransformControls
      ref={transformRef}
      camera={camera}
      domElement={gl.domElement}
      mode="translate"
      position={[selected.center.x, selected.center.y, selected.center.z]}
      onChange={handleChange}
      onMouseUp={handleMouseUp}
    />
  );
}
