"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { PlacedBox, PlacedCylinder, PlacedSphere } from "./types";
import { useRoomStore } from "./room-store";
import { aabbOf, computeAlignedPosition } from "./align-math";

type Shape = PlacedBox | PlacedCylinder | PlacedSphere;
type ShapeType = "box" | "cylinder" | "sphere";
type Side = "min" | "max";

const SRC_COLOR = "#facc15";   // yellow — source face highlights
const TGT_COLOR = "#fb923c";   // orange — target face highlights
const GHOST_COLOR = "#ffffff";
const DIM_COLOR = "#6b7280";   // gray — AABB outline before any axis selected
const LINE_W = 2;
const DIM_LINE_W = 1;

interface Props {
  source: Shape;
  sourceType: ShapeType;
  target: Shape | null;
  targetType: ShapeType | null;
}

// Returns the 5 points (4 corners + close) of a face rectangle on the given AABB face.
function faceLoop(
  aabb: ReturnType<typeof aabbOf>,
  axis: "x" | "y" | "z",
  side: Side,
): [number, number, number][] {
  const v = aabb[side][axis];

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
  // z
  return [
    [aabb.min.x, aabb.min.y, v],
    [aabb.max.x, aabb.min.y, v],
    [aabb.max.x, aabb.max.y, v],
    [aabb.min.x, aabb.max.y, v],
    [aabb.min.x, aabb.min.y, v],
  ];
}

// Full AABB wireframe as 12 edges (each edge as a 2-point Line).
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
  side,
  axes,
  color,
}: {
  shape: Shape;
  type: ShapeType;
  side: Side;
  axes: { x: boolean; y: boolean; z: boolean };
  color: string;
}) {
  const aabb = aabbOf(shape, type);
  const checkedAxes = (["x", "y", "z"] as const).filter((a) => axes[a]);

  if (checkedAxes.length === 0) {
    // Dim AABB outline while no axes are checked
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
      {checkedAxes.map((axis) => (
        <Line
          key={axis}
          points={faceLoop(aabb, axis, side)}
          color={color}
          lineWidth={LINE_W}
          depthTest={false}
        />
      ))}
    </>
  );
}

function GhostMesh({ shape, type, position }: { shape: Shape; type: ShapeType; position: { x: number; y: number; z: number } }) {
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

  // Offset from position (which is the min-corner / base center / bottom point)
  // to the geometry center
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
    <lineSegments position={[position.x + offset[0], position.y + offset[1], position.z + offset[2]]}>
      <edgesGeometry args={[geo]} />
      <lineBasicMaterial color={GHOST_COLOR} transparent opacity={0.7} depthTest={false} />
    </lineSegments>
  );
}

export function AlignPreviewOverlay({ source, sourceType, target, targetType }: Props) {
  const axes = useRoomStore((s) => s.alignAxes);
  const sourceSide = useRoomStore((s) => s.alignSourceSide);
  const targetSide = useRoomStore((s) => s.alignTargetSide);

  const anyAxis = axes.x || axes.y || axes.z;

  const ghostPosition = useMemo(() => {
    if (!target || !targetType || !anyAxis) return null;
    return computeAlignedPosition(source, sourceType, target, targetType, axes, sourceSide, targetSide);
  }, [source, sourceType, target, targetType, axes, sourceSide, targetSide, anyAxis]);

  return (
    <>
      {/* Source face highlights (or dim AABB outline) */}
      <FaceHighlights shape={source} type={sourceType} side={sourceSide} axes={axes} color={SRC_COLOR} />

      {/* Target face highlights */}
      {target && targetType && (
        <FaceHighlights shape={target} type={targetType} side={targetSide} axes={axes} color={TGT_COLOR} />
      )}

      {/* Ghost preview */}
      {ghostPosition && (
        <GhostMesh shape={source} type={sourceType} position={ghostPosition} />
      )}
    </>
  );
}
