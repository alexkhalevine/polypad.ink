"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { PlacedBox } from "@/app/room/[id]/_client/types";

interface PlacedBoxMeshProps {
  box: PlacedBox;
  positionOverride?: { x: number; y: number; z: number };
  color?: string | null;
  isSelected?: boolean;
  isHovered?: boolean;
  wireframe?: boolean;
  lockInfo?: { color: string; displayName: string };
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

const DEFAULT_COLOR = "#2f74c0";

export function PlacedBoxMesh({ box, positionOverride, color, isSelected, isHovered, wireframe, lockInfo, onClick, onPointerEnter, onPointerLeave }: PlacedBoxMeshProps) {
  const geo = useMemo(
    () => new THREE.BoxGeometry(box.width, box.height, box.depth),
    [box.width, box.height, box.depth]
  );

  const [x, y, z] = positionOverride
    ? [positionOverride.x, positionOverride.y, positionOverride.z]
    : [box.center.x, box.center.y, box.center.z];

  const edgeColor = lockInfo ? lockInfo.color : (isSelected || isHovered ? "#ffffff" : "#1a3a5c");

  return (
    <group position={[x, y, z]}>
      <mesh geometry={geo} onClick={onClick} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
        <meshStandardMaterial color={color ?? DEFAULT_COLOR} wireframe={wireframe} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geo]} />
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>
      {lockInfo && (
        <Html position={[0, box.height / 2 + 0.5, 0]} center pointerEvents="none">
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
