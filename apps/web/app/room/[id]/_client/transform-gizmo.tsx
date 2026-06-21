"use client";

import * as THREE from "three";
import { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import { PlacedBox, PlacedCylinder, PlacedSphere, PlacedMesh } from "./types";
import { useRoomStore } from "./room-store";

interface TransformGizmoProps {
  mode: "translate" | "rotate";
  selectedObjectId: string | null;
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  placedMeshes: PlacedMesh[];
  onObjectMove?: (objectId: string, newPosition: THREE.Vector3, persist: boolean) => void;
  onObjectRotate?: (
    objectId: string,
    euler: { x: number; y: number; z: number },
    persist: boolean,
  ) => void;
  onDragStart?: (objectId: string) => Promise<{ ok: boolean; lockedBy?: string }>;
  onDragEnd?: (objectId: string) => void;
}

// Per-type offset from the bottom-anchor (position) to the geometric center —
// the pivot the rotate gizmo and mesh rendering rotate about.
function centerOffset(
  obj: PlacedBox | PlacedCylinder | PlacedSphere | PlacedMesh,
  type: "box" | "cylinder" | "sphere" | "mesh",
): [number, number, number] {
  if (type === "box") {
    const b = obj as PlacedBox;
    return [b.width / 2, b.height / 2, b.depth / 2];
  }
  if (type === "cylinder") {
    const c = obj as PlacedCylinder;
    return [0, c.height / 2, 0];
  }
  if (type === "sphere") {
    return [0, (obj as PlacedSphere).radius, 0];
  }
  return [0, 0, 0];
}

export function TransformGizmo({
  mode,
  selectedObjectId,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  placedMeshes,
  onObjectMove,
  onObjectRotate,
  onDragStart,
  onDragEnd,
}: TransformGizmoProps) {
  const { camera, gl } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformRef = useRef<any>(null);
  const lockedRef = useRef(false);

  const objectLocks = useRoomStore((s) => s.objectLocks);
  const snapEnabled = useRoomStore((s) => s.snapEnabled);
  const isRemoteLocked = selectedObjectId ? Boolean(objectLocks[selectedObjectId]) : false;

  const selected = (() => {
    if (!selectedObjectId) return null;
    const box = placedBoxes.find((o) => o.id === selectedObjectId);
    if (box) return { obj: box, type: "box" as const };
    const cyl = placedCylinders.find((o) => o.id === selectedObjectId);
    if (cyl) return { obj: cyl, type: "cylinder" as const };
    const sph = placedSpheres.find((o) => o.id === selectedObjectId);
    if (sph) return { obj: sph, type: "sphere" as const };
    const mesh = placedMeshes.find((o) => o.id === selectedObjectId);
    if (mesh) return { obj: mesh, type: "mesh" as const };
    return null;
  })();

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
    const obj = transformRef.current?.object;
    if (!obj || !selectedObjectId) return;
    if (mode === "translate") {
      if (!onObjectMove) return;
      const pos = obj.position.clone();
      pos.y = Math.max(0, pos.y);
      onObjectMove(selectedObjectId, pos, false);
    } else {
      if (!onObjectRotate) return;
      const r = obj.rotation as THREE.Euler;
      onObjectRotate(selectedObjectId, { x: r.x, y: r.y, z: r.z }, false);
    }
  };

  const handleMouseUp = () => {
    if (!lockedRef.current) return;
    const obj = transformRef.current?.object;
    if (!obj || !selectedObjectId) return;
    if (mode === "translate") {
      if (!onObjectMove) return;
      const pos = obj.position.clone();
      pos.y = Math.max(0, pos.y);
      onObjectMove(selectedObjectId, pos, true);
    } else {
      if (!onObjectRotate) return;
      const r = obj.rotation as THREE.Euler;
      onObjectRotate(selectedObjectId, { x: r.x, y: r.y, z: r.z }, true);
    }
  };

  if (!selected || isRemoteLocked) return null;

  const { position } = selected.obj;
  const offset = centerOffset(selected.obj, selected.type);
  // Translate grabs the bottom-anchor; rotate sits at the geometric center.
  const gizmoPosition: [number, number, number] =
    mode === "rotate"
      ? [position.x + offset[0], position.y + offset[1], position.z + offset[2]]
      : [position.x, position.y, position.z];
  const rot = selected.obj.rotation;

  return (
    <TransformControls
      // Re-mount when object or mode changes so the controls re-seed position/rotation.
      key={`${selectedObjectId}-${mode}`}
      ref={transformRef}
      camera={camera}
      domElement={gl.domElement}
      mode={mode}
      position={gizmoPosition}
      rotation={mode === "rotate" ? [rot.x, rot.y, rot.z] : undefined}
      rotationSnap={mode === "rotate" && snapEnabled ? Math.PI / 12 : null}
      onChange={handleChange}
      onMouseUp={handleMouseUp}
    />
  );
}
