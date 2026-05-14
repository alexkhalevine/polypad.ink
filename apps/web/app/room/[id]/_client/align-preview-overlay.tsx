"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { PlacedBox, PlacedCylinder, PlacedSphere, AxisSide } from "./types";
import { useRoomStore } from "./room-store";
import { aabbOf, computeAlignedPosition } from "./align-math";

type Shape = PlacedBox | PlacedCylinder | PlacedSphere;
type ShapeType = "box" | "cylinder" | "sphere";

const SRC_COLOR = "#facc15";
const TGT_COLOR = "#fb923c";
const GHOST_COLOR = "#ffffff";
const DIM_COLOR = "#6b7280";
const LINE_W = 2;
const DIM_LINE_W = 1;

type ActiveSide = "min" | "center" | "max";

// Returns the 5 points (4 corners + close) of a face rectangle on the given AABB face.
// For "center", draws the midplane cross-section.
function faceLoop(
  aabb: ReturnType<typeof aabbOf>,
  axis: "x" | "y" | "z",
  side: ActiveSide,
): [number, number, number][] {
  const v = side === "center"
    ? (aabb.min[axis] + aabb.max[axis]) / 2
    : aabb[side][axis];

  if (axis === "x") {
    return [
      [v, aabb.min.y, aabb.min.z],
      [v, aabb.max.y, aabb.min.z],
      [v, aabb.max.y, aabb.max.z],
      [v, aabb.min.y, aabb.max.z],
      [v, aabb.min.y, aabb.min.z],
    ];
  }
  if (axis === "y") {
    return [
      [aabb.min.x, v, aabb.min.z],
      [aabb.max.x, v, aabb.min.z],
      [aabb.max.x, v, aabb.max.z],
      [aabb.min.x, v, aabb.max.z],
      [aabb.min.x, v, aabb.min.z],
    ];
  }
  return [
    [aabb.min.x, aabb.min.y, v],
    [aabb.max.x, aabb.min.y, v],
    [aabb.max.x, aabb.max.y, v],
    [aabb.min.x, aabb.max.y, v],
    [aabb.min.x, aabb.min.y, v],
  ];
}

function aabbEdges(aabb: ReturnType<typeof aabbOf>): [number, number, number][][] {
  const { min: n, max: x } = aabb;
  return [
    [[n.x, n.y, n.z], [x.x, n.y, n.z]],
    [[n.x, n.y, x.z], [x.x, n.y, x.z]],
    [[n.x, x.y, n.z], [x.x, x.y, n.z]],
    [[n.x, x.y, x.z], [x.x, x.y, x.z]],
    [[n.x, n.y, n.z], [n.x, x.y, n.z]],
    [[x.x, n.y, n.z], [x.x, x.y, n.z]],
    [[n.x, n.y, x.z], [n.x, x.y, x.z]],
    [[x.x, n.y, x.z], [x.x, x.y, x.z]],
    [[n.x, n.y, n.z], [n.x, n.y, x.z]],
    [[x.x, n.y, n.z], [x.x, n.y, x.z]],
    [[n.x, x.y, n.z], [n.x, x.y, x.z]],
    [[x.x, x.y, n.z], [x.x, x.y, x.z]],
  ];
}

function FaceHighlights({
  shape,
  type,
  axisSides,
  color,
}: {
  shape: Shape;
  type: ShapeType;
  axisSides: { x: AxisSide; y: AxisSide; z: AxisSide };
  color: string;
}) {
  const aabb = aabbOf(shape, type);
  const activeAxes = (["x", "y", "z"] as const).filter(
    (a): a is typeof a => axisSides[a] !== null,
  );

  if (activeAxes.length === 0) {
    const edges = aabbEdges(aabb);
    return (
      <>
        {edges.map((pts, i) => (
          <Line key={i} points={pts} color={DIM_COLOR} lineWidth={DIM_LINE_W} depthTest={false} />
        ))}
      </>
    );
  }

  return (
    <>
      {activeAxes.map((axis) => (
        <Line
          key={axis}
          points={faceLoop(aabb, axis, axisSides[axis] as ActiveSide)}
          color={color}
          lineWidth={LINE_W}
          depthTest={false}
        />
      ))}
    </>
  );
}

function GhostMesh({
  shape,
  type,
  position,
}: {
  shape: Shape;
  type: ShapeType;
  position: { x: number; y: number; z: number };
}) {
  const geo = useMemo(() => {
    if (type === "box") {
      const b = shape as PlacedBox;
      return new THREE.BoxGeometry(b.width, b.height, b.depth);
    }
    if (type === "cylinder") {
      const c = shape as PlacedCylinder;
      return new THREE.CylinderGeometry(c.radius, c.radius, c.height, 32);
    }
    const s = shape as PlacedSphere;
    return new THREE.SphereGeometry(s.radius, 32, 16);
  }, [shape, type]);

  const offset = useMemo(() => {
    if (type === "box") {
      const b = shape as PlacedBox;
      return [b.width / 2, b.height / 2, b.depth / 2] as [number, number, number];
    }
    if (type === "cylinder") {
      const c = shape as PlacedCylinder;
      return [0, c.height / 2, 0] as [number, number, number];
    }
    const s = shape as PlacedSphere;
    return [0, s.radius, 0] as [number, number, number];
  }, [shape, type]);

  return (
    <lineSegments
      position={[position.x + offset[0], position.y + offset[1], position.z + offset[2]]}
    >
      <edgesGeometry args={[geo]} />
      <lineBasicMaterial color={GHOST_COLOR} transparent opacity={0.7} depthTest={false} />
    </lineSegments>
  );
}

interface Props {
  source: Shape;
  sourceType: ShapeType;
  target: Shape | null;
  targetType: ShapeType | null;
}

export function AlignPreviewOverlay({ source, sourceType, target, targetType }: Props) {
  const alignXSide = useRoomStore((s) => s.alignXSide);
  const alignYSide = useRoomStore((s) => s.alignYSide);
  const alignZSide = useRoomStore((s) => s.alignZSide);

  const axisSides = { x: alignXSide, y: alignYSide, z: alignZSide };
  const anyAxis = alignXSide !== null || alignYSide !== null || alignZSide !== null;

  const ghostPosition = useMemo(() => {
    if (!target || !targetType || !anyAxis) return null;
    return computeAlignedPosition(
      source, sourceType, target, targetType,
      alignXSide, alignYSide, alignZSide,
    );
  }, [source, sourceType, target, targetType, alignXSide, alignYSide, alignZSide, anyAxis]);

  return (
    <>
      <FaceHighlights shape={source} type={sourceType} axisSides={axisSides} color={SRC_COLOR} />

      {target && targetType && (
        <FaceHighlights shape={target} type={targetType} axisSides={axisSides} color={TGT_COLOR} />
      )}

      {ghostPosition && (
        <GhostMesh shape={source} type={sourceType} position={ghostPosition} />
      )}
    </>
  );
}
