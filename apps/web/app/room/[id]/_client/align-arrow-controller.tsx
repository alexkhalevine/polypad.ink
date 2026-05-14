"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { PlacedBox, PlacedCylinder, PlacedSphere } from "./types";
import { useRoomStore } from "./room-store";
import { aabbOf } from "./align-math";

type Shape = PlacedBox | PlacedCylinder | PlacedSphere;
type ShapeType = "box" | "cylinder" | "sphere";

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ARROW_COLOR = "#f59e0b";
const CONE_HEIGHT = 0.3;

interface Props {
  source: Shape;
  sourceType: ShapeType;
}

export function AlignArrowController({ source, sourceType }: Props) {
  const { camera, gl } = useThree();
  const setAlignTargetId = useRoomStore((s) => s.setAlignTargetId);
  const setAlignDragging = useRoomStore((s) => s.setAlignDragging);

  const draggingRef = useRef(false);
  const [arrowTip, setArrowTip] = useState<THREE.Vector3 | null>(null);

  const aabb = aabbOf(source, sourceType);
  const sourceCenter = new THREE.Vector3(
    (aabb.min.x + aabb.max.x) / 2,
    (aabb.min.y + aabb.max.y) / 2,
    (aabb.min.z + aabb.max.z) / 2,
  );

  useEffect(() => {
    const el = gl.domElement;

    function toNdc(e: PointerEvent) {
      const rect = el.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
    }

    function getGroundPoint(e: PointerEvent): THREE.Vector3 | null {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(toNdc(e), camera);
      const hit = new THREE.Vector3();
      return raycaster.ray.intersectPlane(GROUND_PLANE, hit) ? hit : null;
    }

    function onDown(e: PointerEvent) {
      draggingRef.current = true;
      setAlignDragging(true);
      const pt = getGroundPoint(e);
      if (pt) setArrowTip(pt.clone());
    }

    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      const pt = getGroundPoint(e);
      if (pt) setArrowTip(pt.clone());
    }

    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setAlignDragging(false);
      setArrowTip(null);
      const hovered = useRoomStore.getState().hoveredObjectId;
      const selected = useRoomStore.getState().selectedObjectId;
      if (hovered && hovered !== selected) {
        setAlignTargetId(hovered);
      }
    }

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setAlignDragging(false);
    };
  }, [camera, gl.domElement, setAlignDragging, setAlignTargetId]);

  if (!arrowTip) return null;

  const dir = arrowTip.clone().sub(sourceCenter);
  const length = dir.length();
  if (length < 0.01) return null;
  dir.normalize();

  const shaftEnd = arrowTip.clone().sub(dir.clone().multiplyScalar(CONE_HEIGHT));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  return (
    <>
      <Line
        points={[sourceCenter.toArray(), shaftEnd.toArray()]}
        color={ARROW_COLOR}
        lineWidth={2.5}
        depthTest={false}
      />
      <mesh position={arrowTip.toArray()} quaternion={q}>
        <coneGeometry args={[0.1, CONE_HEIGHT, 8]} />
        <meshBasicMaterial color={ARROW_COLOR} depthTest={false} />
      </mesh>
    </>
  );
}
