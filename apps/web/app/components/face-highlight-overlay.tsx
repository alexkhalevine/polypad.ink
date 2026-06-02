"use client";

import { useMemo } from "react";
import type { PlacedMesh, ExtrudeFace } from "@/app/room/[id]/_client/types";
import {
  buildWorldGeometry,
  weldByPosition,
  selectCoplanarFaceGroup,
  faceGeometryFromGroup,
} from "@/app/room/[id]/_client/extrude-utils";

const FILL_COLOR = "#22d3ee";

interface FaceHighlightOverlayProps {
  mesh: PlacedMesh;
  face: ExtrudeFace;
}

// Translucent fill over the coplanar face the user clicked. The geometry is built in
// world space (buildWorldGeometry already bakes mesh.position in), so it renders at
// the origin and lines up with the placed mesh.
export function FaceHighlightOverlay({ mesh, face }: FaceHighlightOverlayProps) {
  const fillGeo = useMemo(() => {
    const base = weldByPosition(buildWorldGeometry(mesh, "mesh"));
    const group = selectCoplanarFaceGroup(base, face.normal, face.point);
    return faceGeometryFromGroup(base, group);
    // mesh identity changes when geometry changes; face changes per click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesh, face]);

  return (
    <mesh geometry={fillGeo}>
      <meshBasicMaterial
        color={FILL_COLOR}
        transparent
        opacity={0.35}
        side={2 /* THREE.DoubleSide */}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}
