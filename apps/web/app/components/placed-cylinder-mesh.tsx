"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { PlacedCylinder } from "@/app/room/[id]/_client/types";
import { RemoteSelectionOutline } from "./remote-selection-outline";

interface PlacedCylinderMeshProps {
  cylinder: PlacedCylinder;
  positionOverride?: { x: number; y: number; z: number };
  color?: string | null;
  isSelected?: boolean;
  isHovered?: boolean;
  wireframe?: boolean;
  dimmed?: boolean;
  lockInfo?: { color: string; displayName: string };
  selectionInfo?: { color: string; displayName: string };
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onPointerMove?: (e: ThreeEvent<MouseEvent>) => void;
}

const DEFAULT_COLOR = "#2f74c0";
const DIM_OPACITY = 0.15;
// Skip raycasting so dimmed objects can't be hovered/clicked and clicks pass through.
const NO_RAYCAST: THREE.Object3D["raycast"] = () => {};

export function PlacedCylinderMesh({ cylinder, positionOverride, color, isSelected, isHovered, wireframe, dimmed, lockInfo, selectionInfo, onClick, onPointerEnter, onPointerLeave, onPointerMove }: PlacedCylinderMeshProps) {
  const geo = useMemo(
    () => new THREE.CylinderGeometry(cylinder.radius, cylinder.radius, cylinder.height, 32),
    [cylinder.radius, cylinder.height]
  );

  const [x, y, z] = positionOverride
    ? [positionOverride.x, positionOverride.y, positionOverride.z]
    : [cylinder.position.x, cylinder.position.y, cylinder.position.z];

  const hh = cylinder.height / 2;

  const edgeColor = lockInfo ? lockInfo.color : (isSelected || isHovered ? "#ffffff" : "#1a3a5c");

  return (
    <group position={[x, y, z]}>
      <mesh geometry={geo} position={[0, hh, 0]} raycast={dimmed ? NO_RAYCAST : undefined} onClick={onClick} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave} onPointerMove={onPointerMove}>
        <meshStandardMaterial color={color ?? DEFAULT_COLOR} wireframe={wireframe} transparent={dimmed} opacity={dimmed ? DIM_OPACITY : 1} />
      </mesh>
      <lineSegments position={[0, hh, 0]} raycast={NO_RAYCAST}>
        <edgesGeometry args={[geo]} />
        <lineBasicMaterial color={edgeColor} transparent={dimmed} opacity={dimmed ? DIM_OPACITY : 1} />
      </lineSegments>
      {lockInfo && (
        <Html position={[0, cylinder.height + 0.5, 0]} center pointerEvents="none">
          <div style={{
            pointerEvents: "none",
            userSelect: "none",
            fontSize: 11,
            fontFamily: "sans-serif",
            color: lockInfo.color,
            background: "rgba(0,0,0,0.65)",
            borderRadius: 4,
            padding: "2px 7px",
            whiteSpace: "nowrap",
            border: `1px solid ${lockInfo.color}`,
          }}>
            locked by {lockInfo.displayName}
          </div>
        </Html>
      )}
      {selectionInfo && !lockInfo && (
        <RemoteSelectionOutline
          geometry={geo}
          position={[0, hh, 0]}
          labelPosition={[0, cylinder.height + 0.5, 0]}
          color={selectionInfo.color}
          displayName={selectionInfo.displayName}
        />
      )}
    </group>
  );
}
