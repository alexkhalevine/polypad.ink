"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { PlacedSphere } from "@/app/room/[id]/_client/types";
import { RemoteSelectionOutline } from "./remote-selection-outline";

interface PlacedSphereMeshProps {
  sphere: PlacedSphere;
  positionOverride?: { x: number; y: number; z: number };
  color?: string | null;
  isSelected?: boolean;
  isHovered?: boolean;
  wireframe?: boolean;
  dimmed?: boolean;
  lockInfo?: { color: string; displayName: string };
  selectionInfo?: { color: string; displayName: string };
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

const DEFAULT_COLOR = "#2f74c0";
const DIM_OPACITY = 0.15;
// Skip raycasting so dimmed objects can't be hovered/clicked and clicks pass through.
const NO_RAYCAST: THREE.Object3D["raycast"] = () => {};

export function PlacedSphereMesh({ sphere, positionOverride, color, isSelected, isHovered, wireframe, dimmed, lockInfo, selectionInfo, onClick, onPointerEnter, onPointerLeave }: PlacedSphereMeshProps) {
  const geo = useMemo(
    () => new THREE.SphereGeometry(sphere.radius, 32, 16),
    [sphere.radius]
  );

  const [x, y, z] = positionOverride
    ? [positionOverride.x, positionOverride.y, positionOverride.z]
    : [sphere.position.x, sphere.position.y, sphere.position.z];

  const edgeColor = lockInfo ? lockInfo.color : (isSelected || isHovered ? "#ffffff" : "#1a3a5c");

  return (
    <group position={[x, y, z]}>
      <mesh geometry={geo} position={[0, sphere.radius, 0]} raycast={dimmed ? NO_RAYCAST : undefined} onClick={onClick} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
        <meshStandardMaterial color={color ?? DEFAULT_COLOR} wireframe={wireframe} transparent={dimmed} opacity={dimmed ? DIM_OPACITY : 1} />
      </mesh>
      <lineSegments position={[0, sphere.radius, 0]} raycast={NO_RAYCAST}>
        <edgesGeometry args={[geo]} />
        <lineBasicMaterial color={edgeColor} transparent={dimmed} opacity={dimmed ? DIM_OPACITY : 1} />
      </lineSegments>
      {lockInfo && (
        <Html position={[0, sphere.radius * 2 + 0.5, 0]} center pointerEvents="none">
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
          position={[0, sphere.radius, 0]}
          labelPosition={[0, sphere.radius * 2 + 0.5, 0]}
          color={selectionInfo.color}
          displayName={selectionInfo.displayName}
        />
      )}
    </group>
  );
}
