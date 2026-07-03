"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { PlacedBox, ExtrudeState } from "./types";
import { aabbOf } from "./align-math";
import { faceAxis, faceSign } from "./mate-math";
import { clampPointToFace, computeExtrusionBox, inPlaneAxes } from "./extrude-math";

const RECT_COLOR = "#4fe3c1";
const ADD_COLOR = "#4fe3c1";
const CUT_COLOR = "#ff6b6b";
// Lift the rect outline slightly off the face so it doesn't z-fight the box.
const LIFT = 0.002;

type Point = [number, number, number];

interface ExtrudePreviewOverlayProps {
  box: PlacedBox;
  extrude: ExtrudeState;
}

// Live preview for the extrude tool: the sketched rect on the face, and (once
// in the depth phase) a ghost of the tool box — mint for an outward bump,
// red for an inward cut.
export function ExtrudePreviewOverlay({ box, extrude }: ExtrudePreviewOverlayProps) {
  const aabb = useMemo(() => aabbOf(box, "box"), [box]);
  const { face, rectStart, rectEnd, depth, phase } = extrude;

  const rectLoop = useMemo<Point[] | null>(() => {
    if (!face || !rectStart || !rectEnd) return null;
    const start = clampPointToFace(rectStart, aabb, face.faceKey);
    const end = clampPointToFace(rectEnd, aabb, face.faceKey);

    const axis = faceAxis(face.faceKey);
    const [u, v] = inPlaneAxes(face.faceKey);
    const plane = start[axis] + faceSign(face.faceKey) * LIFT;

    const uMin = Math.min(start[u], end[u]);
    const uMax = Math.max(start[u], end[u]);
    const vMin = Math.min(start[v], end[v]);
    const vMax = Math.max(start[v], end[v]);

    const corner = (uVal: number, vVal: number): Point => {
      const p = { x: 0, y: 0, z: 0 };
      p[axis] = plane;
      p[u] = uVal;
      p[v] = vVal;
      return [p.x, p.y, p.z];
    };

    return [corner(uMin, vMin), corner(uMax, vMin), corner(uMax, vMax), corner(uMin, vMax), corner(uMin, vMin)];
  }, [aabb, face, rectStart, rectEnd]);

  const ghost = useMemo(() => {
    if (phase !== "depth" || !face || !rectStart || !rectEnd) return null;
    const tool = computeExtrusionBox(aabb, face.faceKey, rectStart, rectEnd, depth);
    if (!tool) return null;
    const geo = new THREE.BoxGeometry(tool.width, tool.height, tool.depth);
    const center: Point = [
      tool.position.x + tool.width / 2,
      tool.position.y + tool.height / 2,
      tool.position.z + tool.depth / 2,
    ];
    return { geo, center, color: depth > 0 ? ADD_COLOR : CUT_COLOR };
  }, [aabb, face, rectStart, rectEnd, depth, phase]);

  return (
    <>
      {rectLoop && <Line points={rectLoop} color={RECT_COLOR} lineWidth={2} depthTest={false} />}
      {ghost && (
        <>
          <mesh geometry={ghost.geo} position={ghost.center}>
            <meshStandardMaterial color={ghost.color} transparent opacity={0.35} depthWrite={false} />
          </mesh>
          <lineSegments position={ghost.center}>
            <edgesGeometry args={[ghost.geo]} />
            <lineBasicMaterial color={ghost.color} transparent opacity={0.8} depthTest={false} />
          </lineSegments>
        </>
      )}
    </>
  );
}
