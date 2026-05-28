"use client";

import { useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { Html, Line } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { PlacedBox, PlacedCylinder, ExtrudeFace } from "@/app/room/[id]/_client/types";
import { useRoomStore } from "@/app/room/[id]/_client/room-store";

type DimField = "width" | "height" | "depth";

const COLOR = "#22d3ee";
const ARROW_LEN = 1.1;
const HEAD_LEN = 0.32;
const HEAD_RADIUS = 0.13;
const MIN_DIM = 0.01;
const CAP_SEGMENTS = 48;

interface ExtrudeOverlayProps {
  selectedObject: PlacedBox | PlacedCylinder;
  selectedObjectType: "box" | "cylinder";
  face: ExtrudeFace;
  positionOverride?: { x: number; y: number; z: number };
  snapEnabled: boolean;
  onExtrude: (
    field: DimField,
    value: number,
    position: { x: number; y: number; z: number } | null,
    persist: boolean,
  ) => void;
  onDragStart?: (objectId: string) => Promise<{ ok: boolean; lockedBy?: string }>;
  onDragEnd?: (objectId: string) => void;
}

// Everything needed to turn a drag distance / typed range into a new dimension
// and position. Derived from the geometry at the moment an interaction begins so
// live overlays don't feed back into the math.
interface FaceDesc {
  field: DimField;
  axisName: "x" | "y" | "z";
  baseDim: number;
  fixedCoord: number; // world coord of the face that stays put (opposite side)
  side: "min" | "max";
  basePos: { x: number; y: number; z: number };
  faceCenter: THREE.Vector3;
  axisLine: THREE.Vector3; // unit vector along the axis (always positive direction)
  outwardNormal: THREE.Vector3; // axisLine * sign
}

function describe(
  obj: PlacedBox | PlacedCylinder,
  type: "box" | "cylinder",
  face: ExtrudeFace,
  px: number,
  py: number,
  pz: number,
): FaceDesc {
  const sign = face.side === "max" ? 1 : -1;
  const axisLine = new THREE.Vector3(
    face.axis === "x" ? 1 : 0,
    face.axis === "y" ? 1 : 0,
    face.axis === "z" ? 1 : 0,
  );
  const outwardNormal = axisLine.clone().multiplyScalar(sign);
  const basePos = { x: px, y: py, z: pz };

  if (type === "box") {
    const b = obj as PlacedBox;
    const cx = px + b.width / 2;
    const cy = py + b.height / 2;
    const cz = pz + b.depth / 2;
    const min = { x: px, y: py, z: pz };
    const max = { x: px + b.width, y: py + b.height, z: pz + b.depth };

    if (face.axis === "x") {
      const coord = face.side === "max" ? max.x : min.x;
      return {
        field: "width", axisName: "x", baseDim: b.width,
        fixedCoord: face.side === "max" ? min.x : max.x, side: face.side, basePos,
        faceCenter: new THREE.Vector3(coord, cy, cz), axisLine, outwardNormal,
      };
    }
    if (face.axis === "y") {
      const coord = face.side === "max" ? max.y : min.y;
      return {
        field: "height", axisName: "y", baseDim: b.height,
        fixedCoord: face.side === "max" ? min.y : max.y, side: face.side, basePos,
        faceCenter: new THREE.Vector3(cx, coord, cz), axisLine, outwardNormal,
      };
    }
    const coord = face.side === "max" ? max.z : min.z;
    return {
      field: "depth", axisName: "z", baseDim: b.depth,
      fixedCoord: face.side === "max" ? min.z : max.z, side: face.side, basePos,
      faceCenter: new THREE.Vector3(cx, cy, coord), axisLine, outwardNormal,
    };
  }

  // cylinder — only the y-axis caps are extrudable
  const c = obj as PlacedCylinder;
  const coord = face.side === "max" ? py + c.height : py;
  return {
    field: "height", axisName: "y", baseDim: c.height,
    fixedCoord: face.side === "max" ? py : py + c.height, side: face.side, basePos,
    faceCenter: new THREE.Vector3(px, coord, pz), axisLine, outwardNormal,
  };
}

export function ExtrudeOverlay({
  selectedObject,
  selectedObjectType,
  face,
  positionOverride,
  snapEnabled,
  onExtrude,
  onDragStart,
  onDragEnd,
}: ExtrudeOverlayProps) {
  const { camera } = useThree();
  const setExtrudeDragging = useRoomStore((s) => s.setExtrudeDragging);

  const px = positionOverride?.x ?? selectedObject.position.x;
  const py = positionOverride?.y ?? selectedObject.position.y;
  const pz = positionOverride?.z ?? selectedObject.position.z;

  // Live descriptor — drives the visuals so the arrow/highlight track the growing face.
  const live = describe(selectedObject, selectedObjectType, face, px, py, pz);

  const draggingRef = useRef(false);
  const baseRef = useRef<FaceDesc | null>(null);
  const planeRef = useRef(new THREE.Plane());
  const lastDeltaRef = useRef(0);
  const [delta, setDelta] = useState(0);

  // Turn a new absolute dimension into the dimension + position payload, applying
  // the min-size clamp. Only "min"/bottom faces move the object's position.
  function emit(base: FaceDesc, newDim: number, persist: boolean) {
    const dim = Math.max(MIN_DIM, newDim);
    const movingCoordNew =
      base.side === "max" ? base.fixedCoord + dim : base.fixedCoord - dim;
    const position =
      base.side === "min"
        ? { ...base.basePos, [base.axisName]: movingCoordNew }
        : null;
    onExtrude(base.field, dim, position, persist);
    setDelta(dim - base.baseDim);
  }

  function beginDrag(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const base = describe(selectedObject, selectedObjectType, face, px, py, pz);
    baseRef.current = base;
    draggingRef.current = true;
    lastDeltaRef.current = 0;
    setExtrudeDragging(true);

    // Drag plane: contains the drag axis and faces the camera as squarely as possible.
    const toCam = camera.position.clone().sub(base.faceCenter);
    const along = base.axisLine.clone().multiplyScalar(toCam.dot(base.axisLine));
    const pn = toCam.sub(along);
    if (pn.lengthSq() < 1e-6) pn.set(0, 1, 0);
    pn.normalize();
    planeRef.current.setFromNormalAndCoplanarPoint(pn, base.faceCenter);

    onDragStart?.(selectedObject.id);
  }

  function moveDrag(e: ThreeEvent<PointerEvent>) {
    if (!draggingRef.current || !baseRef.current) return;
    e.stopPropagation();
    const base = baseRef.current;
    const hit = new THREE.Vector3();
    if (!e.ray.intersectPlane(planeRef.current, hit)) return;
    const d = hit.sub(base.faceCenter).dot(base.outwardNormal); // signed outward distance
    lastDeltaRef.current = d;

    let newDim = base.baseDim + d;
    if (snapEnabled) {
      // Snap the moving face onto the integer grid, then derive the dimension.
      const movingCoordBase = base.side === "max"
        ? base.fixedCoord + base.baseDim
        : base.fixedCoord - base.baseDim;
      const movingCoordNew = Math.round(movingCoordBase + base.outwardNormal[base.axisName] * d);
      newDim = base.side === "max"
        ? movingCoordNew - base.fixedCoord
        : base.fixedCoord - movingCoordNew;
    }
    emit(base, newDim, false);
  }

  function endDrag(e: ThreeEvent<PointerEvent>) {
    if (!draggingRef.current || !baseRef.current) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    draggingRef.current = false;
    setExtrudeDragging(false);

    const base = baseRef.current;
    let newDim = base.baseDim + lastDeltaRef.current;
    if (snapEnabled) {
      const movingCoordBase = base.side === "max"
        ? base.fixedCoord + base.baseDim
        : base.fixedCoord - base.baseDim;
      const movingCoordNew = Math.round(
        movingCoordBase + base.outwardNormal[base.axisName] * lastDeltaRef.current,
      );
      newDim = base.side === "max"
        ? movingCoordNew - base.fixedCoord
        : base.fixedCoord - movingCoordNew;
    }
    emit(base, newDim, true);
    baseRef.current = null;
    setDelta(0);
    onDragEnd?.(selectedObject.id);
  }

  // Typed extrusion range: relative to the current (live) geometry, no snapping.
  function commitTyped(v: number) {
    const base = describe(selectedObject, selectedObjectType, face, px, py, pz);
    emit(base, base.baseDim + v, true);
    setDelta(0);
  }

  // Arrow group, oriented so its local +Y points outward along the face normal.
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    live.outwardNormal,
  );

  const labelPos = live.faceCenter
    .clone()
    .add(live.outwardNormal.clone().multiplyScalar(ARROW_LEN + HEAD_LEN + 0.25));

  return (
    <>
      <Line
        points={faceBorder(selectedObject, selectedObjectType, face, px, py, pz)}
        color={COLOR}
        lineWidth={2.5}
        depthTest={false}
        transparent
      />

      <group
        position={[live.faceCenter.x, live.faceCenter.y, live.faceCenter.z]}
        quaternion={quat}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
      >
        {/* shaft */}
        <mesh position={[0, ARROW_LEN / 2, 0]}>
          <cylinderGeometry args={[0.025, 0.025, ARROW_LEN, 12]} />
          <meshBasicMaterial color={COLOR} depthTest={false} transparent />
        </mesh>
        {/* head */}
        <mesh position={[0, ARROW_LEN + HEAD_LEN / 2, 0]}>
          <coneGeometry args={[HEAD_RADIUS, HEAD_LEN, 16]} />
          <meshBasicMaterial color={COLOR} depthTest={false} transparent />
        </mesh>
        {/* invisible fat hit area for easy grabbing */}
        <mesh position={[0, (ARROW_LEN + HEAD_LEN) / 2, 0]}>
          <cylinderGeometry args={[0.25, 0.25, ARROW_LEN + HEAD_LEN, 8]} />
          <meshBasicMaterial transparent opacity={0} depthTest={false} />
        </mesh>
      </group>

      <Html position={[labelPos.x, labelPos.y, labelPos.z]} center zIndexRange={[100, 0]}>
        <ExtrudeInput value={delta} onCommit={commitTyped} />
      </Html>
    </>
  );
}

function faceBorder(
  obj: PlacedBox | PlacedCylinder,
  type: "box" | "cylinder",
  face: ExtrudeFace,
  px: number,
  py: number,
  pz: number,
): [number, number, number][] {
  if (type === "cylinder") {
    const c = obj as PlacedCylinder;
    const y = face.side === "max" ? py + c.height : py;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= CAP_SEGMENTS; i++) {
      const a = (i / CAP_SEGMENTS) * Math.PI * 2;
      pts.push([px + Math.cos(a) * c.radius, y, pz + Math.sin(a) * c.radius]);
    }
    return pts;
  }

  const b = obj as PlacedBox;
  const min = { x: px, y: py, z: pz };
  const max = { x: px + b.width, y: py + b.height, z: pz + b.depth };

  if (face.axis === "x") {
    const v = face.side === "max" ? max.x : min.x;
    return [
      [v, min.y, min.z], [v, max.y, min.z], [v, max.y, max.z], [v, min.y, max.z], [v, min.y, min.z],
    ];
  }
  if (face.axis === "y") {
    const v = face.side === "max" ? max.y : min.y;
    return [
      [min.x, v, min.z], [max.x, v, min.z], [max.x, v, max.z], [min.x, v, max.z], [min.x, v, min.z],
    ];
  }
  const v = face.side === "max" ? max.z : min.z;
  return [
    [min.x, min.y, v], [max.x, min.y, v], [max.x, max.y, v], [min.x, max.y, v], [min.x, min.y, v],
  ];
}

// Mirrors the dimension input styling, but accepts any finite number (the extrusion
// range can be negative or zero), and shows a leading sign.
function ExtrudeInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState(value.toFixed(2));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value.toFixed(2));
  }

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed)) {
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
