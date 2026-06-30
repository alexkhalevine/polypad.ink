"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { PlacedBox, PlacedCylinder, PlacedSphere, PlacedCone, FaceKey, MateMode } from "./types";
import { aabbOf, Shape, ShapeType } from "./align-math";
import { computeMatePosition } from "./mate-math";
import { faceCenter } from "./face-overlay";

const GHOST_COLOR = "#ffffff";
const ARROW_COLOR = "#c4b5ff";
const ARROW_LENGTH = 0.12;
const ARROW_RADIUS = 0.04;

function geometryFor(shape: Shape, type: ShapeType): THREE.BufferGeometry {
  if (type === "box") {
    const b = shape as PlacedBox;
    return new THREE.BoxGeometry(b.width, b.height, b.depth);
  }
  if (type === "cylinder") {
    const c = shape as PlacedCylinder;
    return new THREE.CylinderGeometry(c.radius, c.radius, c.height, 32);
  }
  if (type === "cone") {
    const c = shape as PlacedCone;
    return new THREE.ConeGeometry(c.radius, c.height, 32);
  }
  const s = shape as PlacedSphere;
  return new THREE.SphereGeometry(s.radius, 32, 16);
}

function centerOffset(shape: Shape, type: ShapeType): [number, number, number] {
  if (type === "box") {
    const b = shape as PlacedBox;
    return [b.width / 2, b.height / 2, b.depth / 2];
  }
  if (type === "cylinder" || type === "cone") {
    const c = shape as PlacedCylinder | PlacedCone;
    return [0, c.height / 2, 0];
  }
  const s = shape as PlacedSphere;
  return [0, s.radius, 0];
}

interface MatePreviewOverlayProps {
  source: Shape;
  sourceType: ShapeType;
  sourceFaceKey: FaceKey;
  target: Shape;
  targetType: ShapeType;
  targetFaceKey: FaceKey;
  mode: MateMode;
  offset: number;
}

// Once both faces are picked: a ghost of the source at its computed mated
// position, plus a dashed connector with an arrowhead from source face to
// target face so the move reads clearly before the user confirms.
export function MatePreviewOverlay({
  source,
  sourceType,
  sourceFaceKey,
  target,
  targetType,
  targetFaceKey,
  mode,
  offset,
}: MatePreviewOverlayProps) {
  const newPos = useMemo(
    () => computeMatePosition(source, sourceType, sourceFaceKey, target, targetType, targetFaceKey, mode, offset),
    [source, sourceType, sourceFaceKey, target, targetType, targetFaceKey, mode, offset],
  );

  const geo = useMemo(() => geometryFor(source, sourceType), [source, sourceType]);
  const pivotOffset = useMemo(() => centerOffset(source, sourceType), [source, sourceType]);

  const sourceFaceCenterAfterMove = useMemo(() => {
    const moved = { ...source, position: new THREE.Vector3(newPos.x, newPos.y, newPos.z) } as Shape;
    return faceCenter(aabbOf(moved, sourceType), sourceFaceKey);
  }, [source, sourceType, sourceFaceKey, newPos]);

  const targetFaceCenterPoint = useMemo(
    () => faceCenter(aabbOf(target, targetType), targetFaceKey),
    [target, targetType, targetFaceKey],
  );

  const { arrowPosition, arrowQuaternion } = useMemo(() => {
    const from = new THREE.Vector3(...sourceFaceCenterAfterMove);
    const to = new THREE.Vector3(...targetFaceCenterPoint);
    const dir = to.clone().sub(from);
    if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0);
    dir.normalize();
    const position = to.clone().addScaledVector(dir, -ARROW_LENGTH / 2);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { arrowPosition: position, arrowQuaternion: quaternion };
  }, [sourceFaceCenterAfterMove, targetFaceCenterPoint]);

  return (
    <>
      <mesh
        geometry={geo}
        position={[newPos.x + pivotOffset[0], newPos.y + pivotOffset[1], newPos.z + pivotOffset[2]]}
      >
        <meshStandardMaterial color={GHOST_COLOR} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <Line
        points={[sourceFaceCenterAfterMove, targetFaceCenterPoint]}
        color={ARROW_COLOR}
        lineWidth={2}
        dashed
        dashSize={0.06}
        gapSize={0.05}
        depthTest={false}
      />
      <mesh position={arrowPosition} quaternion={arrowQuaternion}>
        <coneGeometry args={[ARROW_RADIUS, ARROW_LENGTH, 12]} />
        <meshBasicMaterial color={ARROW_COLOR} depthTest={false} />
      </mesh>
    </>
  );
}
