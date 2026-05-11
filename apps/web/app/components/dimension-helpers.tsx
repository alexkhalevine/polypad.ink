"use client";

import { useState, type CSSProperties } from "react";
import { Html, Line } from "@react-three/drei";
import type {
  PlacedBox,
  PlacedCylinder,
  PlacedSphere,
} from "@/app/room/[id]/_client/types";

type DimensionField = "width" | "height" | "depth" | "radius";

interface DimensionHelpersProps {
  selectedObject: PlacedBox | PlacedCylinder | PlacedSphere;
  selectedObjectType: "box" | "cylinder" | "sphere";
  centerOverride?: { x: number; y: number; z: number };
  onDimensionCommit: (field: DimensionField, value: number) => void;
}

const LINE_COLOR = "#ffeb3b";
const LINE_WIDTH = 1.5;
const OFFSET = 0.3;
const TICK = 0.12;

export function DimensionHelpers({
  selectedObject,
  selectedObjectType,
  centerOverride,
  onDimensionCommit,
}: DimensionHelpersProps) {
  const cx = centerOverride?.x ?? selectedObject.center.x;
  const cy = centerOverride?.y ?? selectedObject.center.y;
  const cz = centerOverride?.z ?? selectedObject.center.z;

  if (selectedObjectType === "box") {
    const box = selectedObject as PlacedBox;
    const hw = box.width / 2;
    const hh = box.height / 2;
    const hd = box.depth / 2;
    return (
      <group position={[cx, cy, cz]}>
        <DimensionBracket
          axis="x"
          length={box.width}
          anchor={[0, -hh, hd + OFFSET]}
          tickAxis="y"
          label="W"
          value={box.width}
          onCommit={(v) => onDimensionCommit("width", v)}
        />
        <DimensionBracket
          axis="y"
          length={box.height}
          anchor={[hw + OFFSET, 0, hd]}
          tickAxis="x"
          label="H"
          value={box.height}
          onCommit={(v) => onDimensionCommit("height", v)}
        />
        <DimensionBracket
          axis="z"
          length={box.depth}
          anchor={[hw + OFFSET, -hh, 0]}
          tickAxis="y"
          label="D"
          value={box.depth}
          onCommit={(v) => onDimensionCommit("depth", v)}
        />
      </group>
    );
  }

  if (selectedObjectType === "cylinder") {
    const cyl = selectedObject as PlacedCylinder;
    const hh = cyl.height / 2;
    return (
      <group position={[cx, cy, cz]}>
        <DimensionBracket
          axis="x"
          length={cyl.radius * 2}
          anchor={[0, -hh, cyl.radius + OFFSET]}
          tickAxis="y"
          label="⌀"
          value={cyl.radius * 2}
          onCommit={(v) => onDimensionCommit("radius", v / 2)}
        />
        <DimensionBracket
          axis="y"
          length={cyl.height}
          anchor={[cyl.radius + OFFSET, 0, 0]}
          tickAxis="x"
          label="H"
          value={cyl.height}
          onCommit={(v) => onDimensionCommit("height", v)}
        />
      </group>
    );
  }

  // sphere
  const sph = selectedObject as PlacedSphere;
  return (
    <group position={[cx, cy, cz]}>
      <DimensionBracket
        axis="x"
        length={sph.radius * 2}
        anchor={[0, -sph.radius, sph.radius + OFFSET]}
        tickAxis="y"
        label="⌀"
        value={sph.radius * 2}
        onCommit={(v) => onDimensionCommit("radius", v / 2)}
      />
    </group>
  );
}

// ─── Bracket ──────────────────────────────────────────────────────────────────

type Axis = "x" | "y" | "z";

interface BracketProps {
  axis: Axis;
  length: number;
  anchor: [number, number, number]; // midpoint of the main line, in parent space
  tickAxis: Axis;                   // axis the perpendicular ticks extend along
  label: string;
  value: number;
  onCommit: (next: number) => void;
}

function DimensionBracket({
  axis,
  length,
  anchor,
  tickAxis,
  label,
  value,
  onCommit,
}: BracketProps) {
  const half = length / 2;
  const dir = axisVec(axis);
  const tickDir = axisVec(tickAxis);

  const start: [number, number, number] = [
    anchor[0] - dir[0] * half,
    anchor[1] - dir[1] * half,
    anchor[2] - dir[2] * half,
  ];
  const end: [number, number, number] = [
    anchor[0] + dir[0] * half,
    anchor[1] + dir[1] * half,
    anchor[2] + dir[2] * half,
  ];
  const tickStartA: [number, number, number] = [
    start[0] - tickDir[0] * TICK,
    start[1] - tickDir[1] * TICK,
    start[2] - tickDir[2] * TICK,
  ];
  const tickStartB: [number, number, number] = [
    start[0] + tickDir[0] * TICK,
    start[1] + tickDir[1] * TICK,
    start[2] + tickDir[2] * TICK,
  ];
  const tickEndA: [number, number, number] = [
    end[0] - tickDir[0] * TICK,
    end[1] - tickDir[1] * TICK,
    end[2] - tickDir[2] * TICK,
  ];
  const tickEndB: [number, number, number] = [
    end[0] + tickDir[0] * TICK,
    end[1] + tickDir[1] * TICK,
    end[2] + tickDir[2] * TICK,
  ];

  return (
    <>
      <Line
        points={[start, end]}
        color={LINE_COLOR}
        lineWidth={LINE_WIDTH}
        depthTest={false}
        transparent
      />
      <Line
        points={[tickStartA, tickStartB]}
        color={LINE_COLOR}
        lineWidth={LINE_WIDTH}
        depthTest={false}
        transparent
      />
      <Line
        points={[tickEndA, tickEndB]}
        color={LINE_COLOR}
        lineWidth={LINE_WIDTH}
        depthTest={false}
        transparent
      />
      <Html position={anchor} center zIndexRange={[100, 0]}>
        <DimensionInlineInput label={label} value={value} onCommit={onCommit} />
      </Html>
    </>
  );
}

function axisVec(axis: Axis): [number, number, number] {
  if (axis === "x") return [1, 0, 0];
  if (axis === "y") return [0, 1, 0];
  return [0, 0, 1];
}

// ─── Inline input (mirrors DimensionInput in menu.tsx, but compact) ───────────

function DimensionInlineInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (next: number) => void;
}) {
  const [draft, setDraft] = useState(value.toFixed(2));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value.toFixed(2));
  }

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDraft(value.toFixed(2));
      return;
    }
    if (parsed !== value) onCommit(parsed);
  };

  return (
    <div style={wrapperStyle} onPointerDown={(e) => e.stopPropagation()}>
      <span style={labelStyle}>{label}</span>
      <input
        type="number"
        step="0.1"
        min="0.01"
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
  border: `1px solid ${LINE_COLOR}`,
  borderRadius: 3,
  padding: "1px 4px",
  fontFamily: "monospace",
  fontSize: 11,
  color: LINE_COLOR,
  userSelect: "none",
};

const labelStyle: CSSProperties = {
  fontWeight: 700,
  opacity: 0.9,
};

const inputStyle: CSSProperties = {
  width: 52,
  padding: "1px 2px",
  fontSize: 11,
  fontFamily: "monospace",
  textAlign: "center",
  background: "transparent",
  color: LINE_COLOR,
  border: "none",
  outline: "none",
  appearance: "textfield",
  MozAppearance: "textfield",
};
