"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
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

export function PlacedMeshComponent({
  mesh,
  positionOverride,
  color,
  isSelected,
  isHovered,
  wireframe,
  dimmed,
  lockInfo,
  selectionInfo,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
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
        raycast={dimmed ? NO_RAYCAST : undefined}
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
      >
        <meshStandardMaterial color={color ?? DEFAULT_COLOR} wireframe={wireframe} transparent={dimmed} opacity={dimmed ? DIM_OPACITY : 1} />
      </mesh>
      {mesh.edges && mesh.edges.length > 0 ? (
        <lineSegments raycast={NO_RAYCAST}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[mesh.edges, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={edgeColor} transparent={dimmed} opacity={dimmed ? DIM_OPACITY : 1} />
        </lineSegments>
      ) : (
        <lineSegments raycast={NO_RAYCAST}>
          <edgesGeometry args={[geo]} />
          <lineBasicMaterial color={edgeColor} transparent={dimmed} opacity={dimmed ? DIM_OPACITY : 1} />
        </lineSegments>
      )}
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
