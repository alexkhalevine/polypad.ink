"use client";

import * as THREE from "three";
import { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import { PlacedBox, PlacedCylinder, PlacedSphere, PlacedCone, PlacedMesh } from "./types";
import { useRoomStore } from "./room-store";
import { DimensionPatch } from "./queries/use-update-object-dimensions";

const MIN_DIM = 0.01;
const clamp = (v: number) => Math.max(MIN_DIM, v);

interface TransformGizmoProps {
  mode: "translate" | "rotate" | "scale";
  selectedObjectId: string | null;
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  placedCones: PlacedCone[];
  placedMeshes: PlacedMesh[];
  onObjectMove?: (objectId: string, newPosition: THREE.Vector3, persist: boolean) => void;
  onObjectRotate?: (
    objectId: string,
    euler: { x: number; y: number; z: number },
    persist: boolean,
  ) => void;
  onObjectScale?: (objectId: string, dimensions: DimensionPatch, persist: boolean) => void;
  onDragStart?: (objectId: string) => Promise<{ ok: boolean; lockedBy?: string }>;
  onDragEnd?: (objectId: string) => void;
}

type Selected =
  | { obj: PlacedBox; type: "box" }
  | { obj: PlacedCylinder; type: "cylinder" }
  | { obj: PlacedSphere; type: "sphere" }
  | { obj: PlacedCone; type: "cone" }
  | { obj: PlacedMesh; type: "mesh" };

// Per-type offset from the bottom-anchor (position) to the geometric center —
// the pivot the rotate gizmo and mesh rendering rotate about.
function centerOffset(
  obj: PlacedBox | PlacedCylinder | PlacedSphere | PlacedCone | PlacedMesh,
  type: "box" | "cylinder" | "sphere" | "cone" | "mesh",
): [number, number, number] {
  if (type === "box") {
    const b = obj as PlacedBox;
    return [b.width / 2, b.height / 2, b.depth / 2];
  }
  if (type === "cylinder") {
    const c = obj as PlacedCylinder;
    return [0, c.height / 2, 0];
  }
  if (type === "cone") {
    const c = obj as PlacedCone;
    return [0, c.height / 2, 0];
  }
  if (type === "sphere") {
    return [0, (obj as PlacedSphere).radius, 0];
  }
  return [0, 0, 0];
}

// Snapshot of the dimensions a scale drag starts from (taken at drag-start, not
// re-derived every tick — the gizmo's own .scale is a multiplier relative to this).
function snapshotDimensions(selected: Selected): DimensionPatch {
  if (selected.type === "box") {
    const b = selected.obj;
    return { width: b.width, height: b.height, depth: b.depth };
  }
  if (selected.type === "cylinder") {
    const c = selected.obj;
    return { radius: c.radius, height: c.height };
  }
  if (selected.type === "cone") {
    const c = selected.obj;
    return { radius: c.radius, height: c.height };
  }
  if (selected.type === "sphere") {
    return { radius: selected.obj.radius };
  }
  return {};
}

// Maps the gizmo's accumulated scale multiplier (relative to the drag-start
// snapshot) onto the object's actual dimension fields.
function mapScale(
  type: "box" | "cylinder" | "sphere" | "cone" | "mesh",
  base: DimensionPatch,
  scale: THREE.Vector3,
): DimensionPatch {
  if (type === "box") {
    return {
      width: clamp((base.width ?? 0) * scale.x),
      height: clamp((base.height ?? 0) * scale.y),
      depth: clamp((base.depth ?? 0) * scale.z),
    };
  }
  if (type === "cylinder" || type === "cone") {
    return {
      radius: clamp((base.radius ?? 0) * ((Math.abs(scale.x) + Math.abs(scale.z)) / 2)),
      height: clamp((base.height ?? 0) * scale.y),
    };
  }
  if (type === "sphere") {
    return {
      radius: clamp(
        (base.radius ?? 0) * ((Math.abs(scale.x) + Math.abs(scale.y) + Math.abs(scale.z)) / 3),
      ),
    };
  }
  return {};
}

export function TransformGizmo({
  mode,
  selectedObjectId,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  placedCones,
  placedMeshes,
  onObjectMove,
  onObjectRotate,
  onObjectScale,
  onDragStart,
  onDragEnd,
}: TransformGizmoProps) {
  const { camera, gl } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformRef = useRef<any>(null);
  const lockedRef = useRef(false);
  const scaleBaseRef = useRef<DimensionPatch | null>(null);

  const objectLocks = useRoomStore((s) => s.objectLocks);
  const snapEnabled = useRoomStore((s) => s.snapEnabled);
  const isRemoteLocked = selectedObjectId ? Boolean(objectLocks[selectedObjectId]) : false;

  const selected: Selected | null = (() => {
    if (!selectedObjectId) return null;
    const box = placedBoxes.find((o) => o.id === selectedObjectId);
    if (box) return { obj: box, type: "box" };
    const cyl = placedCylinders.find((o) => o.id === selectedObjectId);
    if (cyl) return { obj: cyl, type: "cylinder" };
    const sph = placedSpheres.find((o) => o.id === selectedObjectId);
    if (sph) return { obj: sph, type: "sphere" };
    const cone = placedCones.find((o) => o.id === selectedObjectId);
    if (cone) return { obj: cone, type: "cone" };
    const mesh = placedMeshes.find((o) => o.id === selectedObjectId);
    if (mesh) return { obj: mesh, type: "mesh" };
    return null;
  })();

  // Always-current snapshot for the dragging-changed handler below, which is only
  // re-subscribed when selectedObjectId/onDragStart/onDragEnd change — not on every
  // render — so it can't close over a stale `selected` otherwise.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const controls = transformRef.current;
    if (!controls || !selectedObjectId) return;
    const handleDraggingChanged = async ({ value }: { value: boolean }) => {
      if (value) {
        lockedRef.current = onDragStart ? (await onDragStart(selectedObjectId)).ok : true;
        if (mode === "scale" && selectedRef.current) {
          scaleBaseRef.current = snapshotDimensions(selectedRef.current);
        }
      } else {
        onDragEnd?.(selectedObjectId);
        lockedRef.current = false;
      }
    };
    controls.addEventListener("dragging-changed", handleDraggingChanged);
    return () => controls.removeEventListener("dragging-changed", handleDraggingChanged);
  }, [selectedObjectId, mode, onDragStart, onDragEnd]);

  const handleChange = () => {
    if (!lockedRef.current) return;
    const obj = transformRef.current?.object;
    if (!obj || !selectedObjectId) return;
    if (mode === "translate") {
      if (!onObjectMove) return;
      const pos = obj.position.clone();
      pos.y = Math.max(0, pos.y);
      onObjectMove(selectedObjectId, pos, false);
    } else if (mode === "rotate") {
      if (!onObjectRotate) return;
      const r = obj.rotation as THREE.Euler;
      onObjectRotate(selectedObjectId, { x: r.x, y: r.y, z: r.z }, false);
    } else {
      if (!onObjectScale || !selected || !scaleBaseRef.current) return;
      const dims = mapScale(selected.type, scaleBaseRef.current, obj.scale as THREE.Vector3);
      onObjectScale(selectedObjectId, dims, false);
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
    } else if (mode === "rotate") {
      if (!onObjectRotate) return;
      const r = obj.rotation as THREE.Euler;
      onObjectRotate(selectedObjectId, { x: r.x, y: r.y, z: r.z }, true);
    } else {
      if (!onObjectScale || !selected || !scaleBaseRef.current) return;
      const dims = mapScale(selected.type, scaleBaseRef.current, obj.scale as THREE.Vector3);
      onObjectScale(selectedObjectId, dims, true);
      // Reset so a second drag in the same session starts from a clean multiplier
      // instead of compounding onto the scale left over from the previous drag.
      obj.scale.set(1, 1, 1);
      scaleBaseRef.current = null;
    }
  };

  if (!selected || isRemoteLocked) return null;
  if (mode === "scale" && selected.type === "mesh") return null;

  const { position } = selected.obj;
  const offset = centerOffset(selected.obj, selected.type);
  // Translate and scale grab the bottom-anchor (the pivot dimension growth happens
  // from); rotate sits at the geometric center.
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
      rotation={mode !== "translate" ? [rot.x, rot.y, rot.z] : undefined}
      space={mode === "scale" ? "local" : undefined}
      rotationSnap={mode === "rotate" && snapEnabled ? Math.PI / 12 : null}
      onChange={handleChange}
      onMouseUp={handleMouseUp}
    />
  );
}
