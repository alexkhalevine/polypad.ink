"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Html, Line } from "@react-three/drei";
import { aabbOf, Shape, ShapeType } from "./align-math";
import { FaceKey } from "./types";
import { faceAxis, faceSign } from "./mate-math";

type AABB = ReturnType<typeof aabbOf>;
type Point = [number, number, number];

export function faceCorners(aabb: AABB, faceKey: FaceKey): [Point, Point, Point, Point] {
  const axis = faceAxis(faceKey);
  const v = faceSign(faceKey) === 1 ? aabb.max[axis] : aabb.min[axis];

  if (axis === "x") {
    return [
      [v, aabb.min.y, aabb.min.z],
      [v, aabb.max.y, aabb.min.z],
      [v, aabb.max.y, aabb.max.z],
      [v, aabb.min.y, aabb.max.z],
    ];
  }
  if (axis === "y") {
    return [
      [aabb.min.x, v, aabb.min.z],
      [aabb.max.x, v, aabb.min.z],
      [aabb.max.x, v, aabb.max.z],
      [aabb.min.x, v, aabb.max.z],
    ];
  }
  return [
    [aabb.min.x, aabb.min.y, v],
    [aabb.max.x, aabb.min.y, v],
    [aabb.max.x, aabb.max.y, v],
    [aabb.min.x, aabb.max.y, v],
  ];
}

export function faceCenter(aabb: AABB, faceKey: FaceKey): Point {
  const [a, , c] = faceCorners(aabb, faceKey);
  return [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
}

function quadGeometry(corners: [Point, Point, Point, Point]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    ...corners[0], ...corners[1], ...corners[2],
    ...corners[0], ...corners[2], ...corners[3],
  ]);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

interface FaceOverlayProps {
  shape: Shape;
  type: ShapeType;
  faceKey: FaceKey;
  color: string;
  fillOpacity?: number;
  label?: string;
  labelTextColor?: string;
}

// Highlights one AABB face of a placed shape: a translucent quad + colored
// border, with an optional floating tag (used for hover / source / target).
export function FaceOverlay({ shape, type, faceKey, color, fillOpacity = 0.18, label, labelTextColor = "#ffffff" }: FaceOverlayProps) {
  const aabb = useMemo(() => aabbOf(shape, type), [shape, type]);
  const corners = useMemo(() => faceCorners(aabb, faceKey), [aabb, faceKey]);
  const center = useMemo(() => faceCenter(aabb, faceKey), [aabb, faceKey]);
  const geometry = useMemo(() => quadGeometry(corners), [corners]);
  const loop = useMemo(() => [...corners, corners[0]] as Point[], [corners]);

  return (
    <>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={color} transparent opacity={fillOpacity} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Line points={loop} color={color} lineWidth={2} depthTest={false} />
      {label && (
        <Html position={center} center pointerEvents="none" zIndexRange={[60, 0]}>
          <div
            style={{
              pointerEvents: "none",
              userSelect: "none",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "sans-serif",
              color: labelTextColor,
              background: color,
              borderRadius: 6,
              padding: "2px 7px",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </>
  );
}
