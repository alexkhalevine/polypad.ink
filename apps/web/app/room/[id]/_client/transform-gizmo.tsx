"use client";

import * as THREE from "three";
import { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import { PlacedBox, PlacedCylinder, PlacedSphere, PlacedMesh } from "./types";
import { useRoomStore } from "./room-store";

interface TransformGizmoProps {
  selectedObjectId: string | null;
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  placedMeshes: PlacedMesh[];
  onObjectMove?: (objectId: string, newPosition: THREE.Vector3, persist: boolean) => void;
  onDragStart?: (objectId: string) => Promise<{ ok: boolean; lockedBy?: string }>;
  onDragEnd?: (objectId: string) => void;
}

export function TransformGizmo({
  selectedObjectId,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  placedMeshes,
  onObjectMove,
  onDragStart,
  onDragEnd,
}: TransformGizmoProps) {
  const { camera, gl } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformRef = useRef<any>(null);
  const lockedRef = useRef(false);

  const objectLocks = useRoomStore((s) => s.objectLocks);
  const isRemoteLocked = selectedObjectId ? Boolean(objectLocks[selectedObjectId]) : false;

  const allObjects = [
    ...placedBoxes.map((b) => ({ id: b.id, position: b.position })),
    ...placedCylinders.map((c) => ({ id: c.id, position: c.position })),
    ...placedSpheres.map((s) => ({ id: s.id, position: s.position })),
    ...placedMeshes.map((m) => ({ id: m.id, position: m.position })),
  ];

  const selected = selectedObjectId
    ? allObjects.find((o) => o.id === selectedObjectId)
    : null;

  useEffect(() => {
    const controls = transformRef.current;
    if (!controls || !selectedObjectId) return;
    const handleDraggingChanged = async ({ value }: { value: boolean }) => {
      if (value) {
        lockedRef.current = onDragStart ? (await onDragStart(selectedObjectId)).ok : true;
      } else {
        onDragEnd?.(selectedObjectId);
        lockedRef.current = false;
      }
    };
    controls.addEventListener("dragging-changed", handleDraggingChanged);
    return () => controls.removeEventListener("dragging-changed", handleDraggingChanged);
  }, [selectedObjectId, onDragStart, onDragEnd]);

  const handleChange = () => {
    if (!lockedRef.current) return;
    if (!transformRef.current || !selectedObjectId || !onObjectMove) return;
    const pos = transformRef.current.object?.position;
    if (pos) {
      pos.y = Math.max(0, pos.y);
      onObjectMove(selectedObjectId, pos.clone(), false);
    }
  };

  const handleMouseUp = () => {
    if (!lockedRef.current) return;
    if (!transformRef.current || !selectedObjectId || !onObjectMove) return;
    const pos = transformRef.current.object?.position;
    if (pos) {
      pos.y = Math.max(0, pos.y);
      onObjectMove(selectedObjectId, pos.clone(), true);
    }
  };

  if (!selected || isRemoteLocked) return null;

  return (
    <TransformControls
      ref={transformRef}
      camera={camera}
      domElement={gl.domElement}
      mode="translate"
      position={[selected.position.x, selected.position.y, selected.position.z]}
      onChange={handleChange}
      onMouseUp={handleMouseUp}
    />
  );
}
