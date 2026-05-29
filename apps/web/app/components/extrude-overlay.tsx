"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { PlacedBox, PlacedCylinder, PlacedMesh, ExtrudeFace } from "@/app/room/[id]/_client/types";
import { useRoomStore } from "@/app/room/[id]/_client/room-store";
import {
  buildWorldGeometry,
  weldByPosition,
  selectCoplanarFaceGroup,
  previewGeometry,
  extrudeFaceGroup,
  finalizeExtruded,
  type ExtrudableType,
  type ExtrudeResult,
} from "@/app/room/[id]/_client/extrude-utils";

const COLOR = "#22d3ee";
const DEFAULT_COLOR = "#2f74c0";
const ARROW_LEN = 1.1;
const HEAD_LEN = 0.32;
const HEAD_RADIUS = 0.13;
const EPS = 1e-4;

interface ExtrudeOverlayProps {
  selectedObject: PlacedBox | PlacedCylinder | PlacedMesh;
  selectedObjectType: ExtrudableType;
  face: ExtrudeFace;
  color?: string | null;
  snapEnabled: boolean;
  onExtrudeCommit: (result: ExtrudeResult) => void;
}

export function ExtrudeOverlay({
  selectedObject,
  selectedObjectType,
  face,
  color,
  snapEnabled,
  onExtrudeCommit,
}: ExtrudeOverlayProps) {
  const { camera } = useThree();
  const setExtrudeDragging = useRoomStore((s) => s.setExtrudeDragging);

  // Base welded geometry + resolved face group. Recomputed only when the object or
  // the picked face changes — the drag itself is just a scalar distance on top.
  const session = useMemo(() => {
    const world = buildWorldGeometry(selectedObject, selectedObjectType);
    const base = weldByPosition(world);
    const group = selectCoplanarFaceGroup(base, face.normal, face.point);
    const normal = group.normal.clone();
    return { base, group, normal, center0: group.centroid.clone() };
  }, [selectedObject, selectedObjectType, face]);

  const [distance, setDistance] = useState(0);
  const draggingRef = useRef(false);
  const planeRef = useRef(new THREE.Plane());

  // Preview mesh (flat-shaded). At distance ≈ 0 this is the un-extruded base, so the
  // hidden original is seamlessly replaced.
  const preview = useMemo(
    () => previewGeometry(session.base, session.group, session.normal, distance),
    [session, distance],
  );
  // Boundary highlight: the (offset) rim of the picked face as independent segments.
  const highlight = useMemo(() => {
    const pos = session.base.getAttribute("position");
    const off = session.normal.clone().multiplyScalar(distance);
    const seg: number[] = [];
    const v = new THREE.Vector3();
    for (const [a, b] of session.group.boundaryLoop) {
      v.fromBufferAttribute(pos, a).add(off);
      seg.push(v.x, v.y, v.z);
      v.fromBufferAttribute(pos, b).add(off);
      seg.push(v.x, v.y, v.z);
    }
    return new Float32Array(seg);
  }, [session, distance]);

  const faceCenter = session.center0.clone().addScaledVector(session.normal, distance);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), session.normal);
  const labelPos = faceCenter.clone().addScaledVector(session.normal, ARROW_LEN + HEAD_LEN + 0.25);

  function beginDrag(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    setExtrudeDragging(true);
    // Drag plane contains the extrusion axis and faces the camera as squarely as possible.
    const toCam = camera.position.clone().sub(session.center0);
    const along = session.normal.clone().multiplyScalar(toCam.dot(session.normal));
    const pn = toCam.sub(along);
    if (pn.lengthSq() < 1e-6) pn.set(0, 1, 0);
    pn.normalize();
    planeRef.current.setFromNormalAndCoplanarPoint(pn, session.center0);
  }

  function moveDrag(e: ThreeEvent<PointerEvent>) {
    if (!draggingRef.current) return;
    e.stopPropagation();
    const hit = new THREE.Vector3();
    if (!e.ray.intersectPlane(planeRef.current, hit)) return;
    let d = hit.sub(session.center0).dot(session.normal); // signed outward distance
    d = Math.max(0, d); // outward only
    if (snapEnabled) d = Math.max(0, Math.round(d));
    setDistance(d);
  }

  function endDrag(e: ThreeEvent<PointerEvent>) {
    if (!draggingRef.current) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    draggingRef.current = false;
    setExtrudeDragging(false);
    commit(distance);
  }

  function commit(d: number) {
    if (d <= EPS) {
      setDistance(0);
      return; // no-op; keep the face picked so the user can try again
    }
    const world = extrudeFaceGroup(session.base, session.group, session.normal, d);
    onExtrudeCommit(finalizeExtruded(world));
    setDistance(0);
  }

  return (
    <>
      <mesh geometry={preview}>
        <meshStandardMaterial color={color ?? DEFAULT_COLOR} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[preview]} />
        <lineBasicMaterial color="#1a3a5c" />
      </lineSegments>

      {/* face rim highlight */}
      {highlight.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[highlight, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={COLOR} depthTest={false} transparent />
        </lineSegments>
      )}

      {/* draggable arrow, local +Y aligned to the outward normal */}
      <group
        position={[faceCenter.x, faceCenter.y, faceCenter.z]}
        quaternion={quat}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
      >
        <mesh position={[0, ARROW_LEN / 2, 0]}>
          <cylinderGeometry args={[0.025, 0.025, ARROW_LEN, 12]} />
          <meshBasicMaterial color={COLOR} depthTest={false} transparent />
        </mesh>
        <mesh position={[0, ARROW_LEN + HEAD_LEN / 2, 0]}>
          <coneGeometry args={[HEAD_RADIUS, HEAD_LEN, 16]} />
          <meshBasicMaterial color={COLOR} depthTest={false} transparent />
        </mesh>
        <mesh position={[0, (ARROW_LEN + HEAD_LEN) / 2, 0]}>
          <cylinderGeometry args={[0.25, 0.25, ARROW_LEN + HEAD_LEN, 8]} />
          <meshBasicMaterial transparent opacity={0} depthTest={false} />
        </mesh>
      </group>

      <Html position={[labelPos.x, labelPos.y, labelPos.z]} center zIndexRange={[100, 0]}>
        <ExtrudeInput value={distance} onCommit={commit} />
      </Html>
    </>
  );
}

// Extrusion-range input. Outward only ⇒ clamps to ≥ 0.
function ExtrudeInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState(value.toFixed(2));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value.toFixed(2));
  }

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDraft(value.toFixed(2));
      return;
    }
    onCommit(parsed);
  };

  return (
    <div style={wrapperStyle} onPointerDown={(e) => e.stopPropagation()}>
      <span style={labelStyle}>↥</span>
      <input
        type="number"
        step="0.1"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value.toFixed(2));
            (e.target as HTMLInputElement).blur();
          }
        }}
        style={inputStyle}
      />
    </div>
  );
}

const wrapperStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "rgba(0,0,0,0.75)",
  border: `1px solid ${COLOR}`,
  borderRadius: 3,
  padding: "1px 4px",
  fontFamily: "monospace",
  fontSize: 11,
  color: COLOR,
  userSelect: "none",
};

const labelStyle: CSSProperties = { fontWeight: 700, opacity: 0.9 };

const inputStyle: CSSProperties = {
  width: 52,
  padding: "1px 2px",
  fontSize: 11,
  fontFamily: "monospace",
  textAlign: "center",
  background: "transparent",
  color: COLOR,
  border: "none",
  outline: "none",
  appearance: "textfield",
  MozAppearance: "textfield",
};
