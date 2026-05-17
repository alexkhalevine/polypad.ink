"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useRoomStore } from "./room-store";
import { brushFrom, evaluateBoolean, type AnyShape, type ShapeKind } from "./csg-utils";

interface BooleanPreviewOverlayProps {
  source: AnyShape;
  sourceKind: ShapeKind;
  target: AnyShape;
  targetKind: ShapeKind;
}

const PREVIEW_COLOR = "#2f74c0";

// In-scene live preview of the chosen boolean operation. Rendered as a
// translucent solid + edge layer (both at 0.5 opacity) so the user can see the
// shape they're about to commit through the surrounding scene.
export function BooleanPreviewOverlay({
  source,
  sourceKind,
  target,
  targetKind,
}: BooleanPreviewOverlayProps) {
  const op = useRoomStore((s) => s.booleanOperation);

  const geometry = useMemo(() => {
    try {
      const a = brushFrom(source, sourceKind);
      const b = brushFrom(target, targetKind);
      const result = evaluateBoolean(a, b, op);
      if (result.positions.length === 0) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(result.positions, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(result.normals, 3));
      if (result.indices) geo.setIndex(new THREE.BufferAttribute(result.indices, 1));
      return geo;
    } catch {
      return null;
    }
  }, [source, sourceKind, target, targetKind, op]);

  if (!geometry) return null;

  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={PREVIEW_COLOR}
          transparent
          opacity={0.5}
          depthWrite={false}
          wireframe={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.5} depthTest={false} />
      </lineSegments>
    </>
  );
}
