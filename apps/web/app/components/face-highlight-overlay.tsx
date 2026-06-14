"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { PlacedBox, PlacedCylinder, PlacedMesh, ExtrudeFace } from "@/app/room/[id]/_client/types";
import {
  buildWorldGeometry,
  weldByPosition,
  selectCoplanarFaceGroup,
  faceGroupFillGeometry,
  type ExtrudableType,
} from "@/app/room/[id]/_client/extrude-utils";

const COLOR = "#22d3ee";

interface FaceHighlightOverlayProps {
  selectedObject: PlacedBox | PlacedCylinder | PlacedMesh;
  selectedObjectType: ExtrudableType;
  face: ExtrudeFace;
}

// Translucent fill + rim painted over the coplanar face under the cursor, so the
// user can see which face the extrude pick will land on before clicking. All
// geometry is world-space, rendered at the scene root like the extrude overlay.
export function FaceHighlightOverlay({
  selectedObject,
  selectedObjectType,
  face,
}: FaceHighlightOverlayProps) {
  // Welded base — once per object; the hovered face just re-resolves the group.
  const base = useMemo(
    () => weldByPosition(buildWorldGeometry(selectedObject, selectedObjectType)),
    [selectedObject, selectedObjectType],
  );

  const { fill, rim } = useMemo(() => {
    const group = selectCoplanarFaceGroup(base, face.normal, face.point);
    if (group.triIndices.length === 0) return { fill: null, rim: new Float32Array(0) };
    const fill = faceGroupFillGeometry(base, group);
    const pos = base.getAttribute("position");
    const seg: number[] = [];
    const v = new THREE.Vector3();
    for (const [a, b] of group.boundaryLoop) {
      v.fromBufferAttribute(pos, a);
      seg.push(v.x, v.y, v.z);
      v.fromBufferAttribute(pos, b);
      seg.push(v.x, v.y, v.z);
    }
    return { fill, rim: new Float32Array(seg) };
  }, [base, face]);

  if (!fill) return null;

  return (
    <>
      <mesh geometry={fill}>
        <meshBasicMaterial
          color={COLOR}
          transparent
          opacity={0.3}
          depthWrite={false}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      {rim.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[rim, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={COLOR} depthTest={false} transparent />
        </lineSegments>
      )}
    </>
  );
}
