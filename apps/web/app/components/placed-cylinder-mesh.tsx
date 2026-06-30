"use client";

import * as THREE from "three";
import { useMemo, type CSSProperties } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { PlacedCylinder } from "@/app/room/[id]/_client/types";
import { RemoteSelectionOutline } from "./remote-selection-outline";

interface PlacedCylinderMeshProps {
  cylinder: PlacedCylinder;
  positionOverride?: { x: number; y: number; z: number };
  rotationOverride?: { x: number; y: number; z: number };
  color?: string | null;
  isSelected?: boolean;
  isAnchor?: boolean;
  isMultiSelected?: boolean;
  isHovered?: boolean;
  wireframe?: boolean;
  lockInfo?: { color: string; displayName: string };
  selectionInfo?: { color: string; displayName: string };
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
}

const DEFAULT_COLOR = "#2f74c0";

export function PlacedCylinderMesh({
  cylinder,
  positionOverride,
  rotationOverride,
  color,
  isSelected,
  isAnchor,
  isMultiSelected,
  isHovered,
  wireframe,
  lockInfo,
  selectionInfo,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
}: PlacedCylinderMeshProps) {
  const geo = useMemo(
    () => new THREE.CylinderGeometry(cylinder.radius, cylinder.radius, cylinder.height, 32),
    [cylinder.radius, cylinder.height]
  );

  const [x, y, z] = positionOverride
    ? [positionOverride.x, positionOverride.y, positionOverride.z]
    : [cylinder.position.x, cylinder.position.y, cylinder.position.z];

  const hh = cylinder.height / 2;

  // Rotation is applied about the geometric center via the pivot group below.
  const rot = rotationOverride ?? cylinder.rotation;

  const edgeColor = lockInfo
    ? lockInfo.color
    : isAnchor
      ? "#8b6dff"
      : isMultiSelected
        ? "#4fe3c1"
        : isSelected || isHovered
          ? "#ffffff"
          : "#1a3a5c";

  return (
    <group position={[x, y, z]}>
      <group position={[0, hh, 0]} rotation={[rot.x, rot.y, rot.z]}>
        <mesh
          geometry={geo}
          onClick={onClick}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onPointerMove={onPointerMove}
        >
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
      {isAnchor && !lockInfo && (
        <Html position={[0, cylinder.height + 0.5, 0]} center pointerEvents="none">
          <div style={anchorBadgeStyle}>★ Anchor</div>
        </Html>
      )}
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
    </group>
  );
}

const anchorBadgeStyle: CSSProperties = {
  pointerEvents: "none",
  userSelect: "none",
  fontSize: 11,
  fontWeight: 600,
  fontFamily: "sans-serif",
  color: "#ffffff",
  background: "#8b6dff",
  borderRadius: 6,
  padding: "2px 8px",
  whiteSpace: "nowrap",
};
