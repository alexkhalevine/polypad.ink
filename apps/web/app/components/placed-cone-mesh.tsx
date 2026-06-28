"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { PlacedCone } from "@/app/room/[id]/_client/types";
import { RemoteSelectionOutline } from "./remote-selection-outline";

interface PlacedConeMeshProps {
  cone: PlacedCone;
  positionOverride?: { x: number; y: number; z: number };
  rotationOverride?: { x: number; y: number; z: number };
  color?: string | null;
  isSelected?: boolean;
  isHovered?: boolean;
  wireframe?: boolean;
  lockInfo?: { color: string; displayName: string };
  selectionInfo?: { color: string; displayName: string };
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

const DEFAULT_COLOR = "#2f74c0";

export function PlacedConeMesh({ cone, positionOverride, rotationOverride, color, isSelected, isHovered, wireframe, lockInfo, selectionInfo, onClick, onPointerEnter, onPointerLeave }: PlacedConeMeshProps) {
  const geo = useMemo(
    () => new THREE.ConeGeometry(cone.radius, cone.height, 32),
    [cone.radius, cone.height]
  );

  const [x, y, z] = positionOverride
    ? [positionOverride.x, positionOverride.y, positionOverride.z]
    : [cone.position.x, cone.position.y, cone.position.z];

  const hh = cone.height / 2;

  // Rotation is applied about the geometric center via the pivot group below.
  const rot = rotationOverride ?? cone.rotation;

  const edgeColor = lockInfo ? lockInfo.color : (isSelected || isHovered ? "#ffffff" : "#1a3a5c");

  return (
    <group position={[x, y, z]}>
      <group position={[0, hh, 0]} rotation={[rot.x, rot.y, rot.z]}>
        <mesh geometry={geo} onClick={onClick} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
          <meshStandardMaterial color={color ?? DEFAULT_COLOR} wireframe={wireframe} />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[geo]} />
          <lineBasicMaterial color={edgeColor} />
        </lineSegments>
        {selectionInfo && !lockInfo && (
          <RemoteSelectionOutline
            geometry={geo}
            position={[0, 0, 0]}
            labelPosition={[0, hh + 0.5, 0]}
            color={selectionInfo.color}
            displayName={selectionInfo.displayName}
          />
        )}
      </group>
      {lockInfo && (
        <Html position={[0, cone.height + 0.5, 0]} center pointerEvents="none">
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
    </group>
  );
}
