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
    : [box.position.x, box.position.y, box.position.z];

  const hw = box.width / 2;
  const hh = box.height / 2;
  const hd = box.depth / 2;

  const edgeColor = lockInfo ? lockInfo.color : (isSelected || isHovered ? "#ffffff" : "#1a3a5c");

  return (
    <group position={[x, y, z]}>
      <mesh geometry={geo} position={[hw, hh, hd]} onClick={onClick} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
        <meshStandardMaterial color={color ?? DEFAULT_COLOR} wireframe={wireframe} />
      </mesh>
      <lineSegments position={[hw, hh, hd]}>
        <edgesGeometry args={[geo]} />
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>
      {lockInfo && (
        <Html position={[hw, box.height + 0.5, hd]} center pointerEvents="none">
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
