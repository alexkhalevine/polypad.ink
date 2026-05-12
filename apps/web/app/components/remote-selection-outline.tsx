"use client";

import * as THREE from "three";
import { useLayoutEffect, useRef } from "react";
import { Html } from "@react-three/drei";

interface Props {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  labelPosition: [number, number, number];
  color: string;
  displayName: string;
}

export function RemoteSelectionOutline({ geometry, position, labelPosition, color, displayName }: Props) {
  const lineRef = useRef<THREE.LineSegments>(null);
  useLayoutEffect(() => {
    lineRef.current?.computeLineDistances();
  }, [geometry]);
  return (
    <>
      <lineSegments ref={lineRef} position={position}>
        <edgesGeometry args={[geometry]} />
        <lineDashedMaterial color={color} dashSize={0.18} gapSize={0.12} />
      </lineSegments>
      <Html position={labelPosition} center pointerEvents="none">
        <div
          style={{
            pointerEvents: "none",
            userSelect: "none",
            fontSize: 11,
            fontFamily: "sans-serif",
            color,
            background: "rgba(0,0,0,0.65)",
            borderRadius: 4,
            padding: "2px 7px",
            whiteSpace: "nowrap",
            border: `1px dashed ${color}`,
          }}
        >
          selected by {displayName}
        </div>
      </Html>
    </>
  );
}
