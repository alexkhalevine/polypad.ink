"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { PlacedMesh } from "@/app/room/[id]/_client/types";
import { geometryFromPlacedMesh } from "@/app/room/[id]/_client/csg-utils";
import { RemoteSelectionOutline } from "./remote-selection-outline";

interface PlacedMeshProps {
  mesh: PlacedMesh;
  positionOverride?: { x: number; y: number; z: number };
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

export function PlacedMeshComponent({
  mesh,
  positionOverride,
  color,
  isSelected,
  isHovered,
  wireframe,
  lockInfo,
  selectionInfo,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: PlacedMeshProps) {
  const geo = useMemo(() => geometryFromPlacedMesh(mesh), [mesh]);

  const [x, y, z] = positionOverride
    ? [positionOverride.x, positionOverride.y, positionOverride.z]
    : [mesh.position.x, mesh.position.y, mesh.position.z];

  const edgeColor = lockInfo ? lockInfo.color : isSelected || isHovered ? "#ffffff" : "#1a3a5c";

  // Label anchor: top of the bounding box (geometry already in world space).
  const labelY = (geo.boundingBox?.max.y ?? 0) - y + 0.5;

  return (
    <group position={[x, y, z]}>
      <mesh
        geometry={geo}
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <meshStandardMaterial color={color ?? DEFAULT_COLOR} wireframe={wireframe} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geo]} />
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>
      {lockInfo && (
        <Html position={[0, labelY, 0]} center pointerEvents="none">
          <div
            style={{
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
            }}
          >
            locked by {lockInfo.displayName}
          </div>
        </Html>
      )}
      {selectionInfo && !lockInfo && (
        <RemoteSelectionOutline
          geometry={geo}
          position={[0, 0, 0]}
          labelPosition={[0, labelY, 0]}
          color={selectionInfo.color}
          displayName={selectionInfo.displayName}
        />
      )}
    </group>
  );
}
