"use client";

import { useState, type ReactNode } from "react";
import { Box as BoxIcon, Plus } from "lucide-react";
import { PlacedBox, PlacedCylinder, PlacedSphere, PlacedMesh } from "./types";
import { useRoomStore } from "./room-store";

type ObjType = "box" | "cylinder" | "sphere" | "mesh" | null;
type DimField = "width" | "height" | "depth" | "radius";

interface InspectorProps {
  selectedObject: PlacedBox | PlacedCylinder | PlacedSphere | PlacedMesh | null;
  selectedObjectType: ObjType;
  currentColor: string;
  onPositionCommit: (x: number, y: number, z: number) => void;
  onRotationCommit: (x: number, y: number, z: number) => void;
  onDimensionCommit: (field: DimField, value: number) => void;
  onColorChange: (color: string) => void;
  onColorBlur: () => void;
  onSwatchCommit: (color: string) => void;
  children?: ReactNode;
}

const MATERIAL_SWATCHES = ["#3f7fe8", "#8b6dff", "#ff5db1", "#4fe3c1", "#ffb454"];

const radToDeg = (r: number) => (r * 180) / Math.PI;
const degToRad = (d: number) => (d * Math.PI) / 180;

export function Inspector({
  selectedObject,
  selectedObjectType,
  currentColor,
  onPositionCommit,
  onRotationCommit,
  onDimensionCommit,
  onColorChange,
  onColorBlur,
  onSwatchCommit,
  children,
}: InspectorProps) {
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const livePositions = useRoomStore((s) => s.livePositions);
  const resetEditorState = useRoomStore((s) => s.resetEditorState);

  const selected = !!selectedObjectId && !!selectedObject;

  return (
    <div className="pp-panel absolute right-4 top-[72px] bottom-[90px] z-20 w-[308px] overflow-y-auto rounded-[18px] p-4">
      {selected ? (
        <SelectedState
          selectedObject={selectedObject!}
          selectedObjectType={selectedObjectType}
          livePosition={livePositions[selectedObject!.id]}
          currentColor={currentColor}
          onDeselect={resetEditorState}
          onPositionCommit={onPositionCommit}
          onRotationCommit={onRotationCommit}
          onDimensionCommit={onDimensionCommit}
          onColorChange={onColorChange}
          onColorBlur={onColorBlur}
          onSwatchCommit={onSwatchCommit}
        >
          {children}
        </SelectedState>
      ) : (
        <UnselectedState />
      )}
    </div>
  );
}

function SelectedState({
  selectedObject,
  selectedObjectType,
  livePosition,
  currentColor,
  onDeselect,
  onPositionCommit,
  onRotationCommit,
  onDimensionCommit,
  onColorChange,
  onColorBlur,
  onSwatchCommit,
  children,
}: {
  selectedObject: PlacedBox | PlacedCylinder | PlacedSphere | PlacedMesh;
  selectedObjectType: ObjType;
  livePosition?: { x: number; y: number; z: number };
  currentColor: string;
  onDeselect: () => void;
  onPositionCommit: (x: number, y: number, z: number) => void;
  onRotationCommit: (x: number, y: number, z: number) => void;
  onDimensionCommit: (field: DimField, value: number) => void;
  onColorChange: (color: string) => void;
  onColorBlur: () => void;
  onSwatchCommit: (color: string) => void;
  children?: ReactNode;
}) {
  const pos = livePosition ?? {
    x: selectedObject.position.x,
    y: selectedObject.position.y,
    z: selectedObject.position.z,
  };
  const rotDeg = {
    x: radToDeg(selectedObject.rotation.x),
    y: radToDeg(selectedObject.rotation.y),
    z: radToDeg(selectedObject.rotation.z),
  };
  const typeName = selectedObjectType
    ? selectedObjectType[0].toUpperCase() + selectedObjectType.slice(1)
    : "Object";

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[#3f7fe8] text-white">
          <BoxIcon size={16} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-[var(--pp-text-primary)]">
            {typeName}
          </div>
          <div className="truncate font-tech text-[11px] text-[var(--pp-text-meta)]">
            #{selectedObject.id.slice(0, 8)}
          </div>
        </div>
        <button
          type="button"
          onClick={onDeselect}
          title="Deselect"
          className="rounded-[8px] bg-[rgba(255,255,255,0.05)] px-[9px] py-[5px] text-[11px] text-[var(--pp-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.12)] hover:text-white"
        >
          Esc
        </button>
      </div>

      {/* Position */}
      <Section label="Position">
        <div className="grid grid-cols-3 gap-2">
          {(["x", "y", "z"] as const).map((axis) => (
            <Field
              key={axis}
              label={axis.toUpperCase()}
              value={pos[axis]}
              onCommit={(next) =>
                onPositionCommit(
                  axis === "x" ? next : pos.x,
                  axis === "y" ? next : pos.y,
                  axis === "z" ? next : pos.z,
                )
              }
            />
          ))}
        </div>
      </Section>

      {/* Rotation (degrees) */}
      <Section label="Rotation°">
        <div className="grid grid-cols-3 gap-2">
          {(["x", "y", "z"] as const).map((axis) => (
            <Field
              key={axis}
              label={axis.toUpperCase()}
              value={rotDeg[axis]}
              onCommit={(next) =>
                onRotationCommit(
                  degToRad(axis === "x" ? next : rotDeg.x),
                  degToRad(axis === "y" ? next : rotDeg.y),
                  degToRad(axis === "z" ? next : rotDeg.z),
                )
              }
            />
          ))}
        </div>
      </Section>

      {/* Dimensions */}
      {selectedObjectType && selectedObjectType !== "mesh" && (
        <Section label="Dimensions">
          <Dimensions
            selectedObject={selectedObject}
            selectedObjectType={selectedObjectType}
            onDimensionCommit={onDimensionCommit}
          />
        </Section>
      )}

      {/* Material */}
      <Section label="Material">
        <div className="flex flex-wrap items-center gap-2">
          {MATERIAL_SWATCHES.map((c) => {
            const active = currentColor?.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => onSwatchCommit(c)}
                className="h-[30px] w-[30px] rounded-[9px]"
                style={{
                  background: c,
                  boxShadow: active
                    ? "0 0 0 2px #0c0b12, 0 0 0 4px var(--pp-mint)"
                    : "none",
                }}
              />
            );
          })}
          {/* Custom color via native picker */}
          <label className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[9px] border border-dashed border-[rgba(255,255,255,0.25)] text-[var(--pp-text-meta)] hover:text-white">
            <Plus size={15} strokeWidth={2} />
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onColorChange(e.target.value)}
              onBlur={onColorBlur}
              className="absolute h-0 w-0 opacity-0"
            />
          </label>
        </div>
      </Section>

      {/* Display */}
      <Section label="Display">
        <DisplayToggles />
      </Section>

      {/* Contextual panels (Align / Boolean) */}
      {children}
    </>
  );
}

function UnselectedState() {
  return (
    <>
      <div>
        <div className="text-[14px] font-semibold text-[var(--pp-text-primary)]">
          Scene
        </div>
        <div className="text-[12px] text-[var(--pp-text-meta)]">
          No object selected
        </div>
      </div>

      <div className="mt-4 rounded-[12px] border border-dashed border-[rgba(255,255,255,0.14)] p-5 text-center text-[13px] text-[var(--pp-text-muted)]">
        Click any shape to edit its position, size and material.
      </div>

      <Section label="View settings">
        <DisplayToggles />
      </Section>
    </>
  );
}

function DisplayToggles() {
  const snapEnabled = useRoomStore((s) => s.snapEnabled);
  const wireframeEnabled = useRoomStore((s) => s.wireframeEnabled);
  const gridOpacity = useRoomStore((s) => s.gridOpacity);
  const toggleSnap = useRoomStore((s) => s.toggleSnap);
  const toggleWireframe = useRoomStore((s) => s.toggleWireframe);
  const setGridOpacity = useRoomStore((s) => s.setGridOpacity);

  return (
    <div className="flex flex-col gap-3">
      <ToggleRow label="Snap to grid" checked={snapEnabled} onChange={toggleSnap} />
      <ToggleRow label="Wireframe" checked={wireframeEnabled} onChange={toggleWireframe} />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[13px] text-[var(--pp-text-secondary)]">
          <span>Grid opacity</span>
          <span className="font-tech text-[12px] text-[var(--pp-text-muted)]">
            {Math.round(gridOpacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(gridOpacity * 100)}
          onChange={(e) => setGridOpacity(Number(e.target.value) / 100)}
          className="pp-range w-full"
        />
      </div>
    </div>
  );
}

function Dimensions({
  selectedObject,
  selectedObjectType,
  onDimensionCommit,
}: {
  selectedObject: PlacedBox | PlacedCylinder | PlacedSphere | PlacedMesh;
  selectedObjectType: Exclude<ObjType, "mesh" | null>;
  onDimensionCommit: (field: DimField, value: number) => void;
}) {
  if (selectedObjectType === "box") {
    const b = selectedObject as PlacedBox;
    return (
      <div className="grid grid-cols-3 gap-2">
        <Field label="W" value={b.width} mint min={0.01} onCommit={(v) => onDimensionCommit("width", v)} />
        <Field label="H" value={b.height} mint min={0.01} onCommit={(v) => onDimensionCommit("height", v)} />
        <Field label="D" value={b.depth} mint min={0.01} onCommit={(v) => onDimensionCommit("depth", v)} />
      </div>
    );
  }
  if (selectedObjectType === "cylinder") {
    const c = selectedObject as PlacedCylinder;
    return (
      <div className="grid grid-cols-2 gap-2">
        <Field label="R" value={c.radius} mint min={0.01} onCommit={(v) => onDimensionCommit("radius", v)} />
        <Field label="H" value={c.height} mint min={0.01} onCommit={(v) => onDimensionCommit("height", v)} />
      </div>
    );
  }
  const s = selectedObject as PlacedSphere;
  return (
    <div className="grid grid-cols-1 gap-2">
      <Field label="R" value={s.radius} mint min={0.01} onCommit={(v) => onDimensionCommit("radius", v)} />
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--pp-text-meta)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onCommit,
  mint,
  min,
}: {
  label: string;
  value: number;
  onCommit: (next: number) => void;
  mint?: boolean;
  min?: number;
}) {
  const [draft, setDraft] = useState(value.toFixed(2));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value.toFixed(2));
  }

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed) || (min !== undefined && parsed < min)) {
      setDraft(value.toFixed(2));
      return;
    }
    if (parsed !== value) onCommit(parsed);
  };

  return (
    <div
      className={`rounded-[10px] border px-2.5 py-2 ${
        mint
          ? "border-[rgba(79,227,193,0.25)] bg-[rgba(79,227,193,0.06)]"
          : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]"
      }`}
    >
      <div className={`text-[10px] ${mint ? "text-[var(--pp-mint)]" : "text-[var(--pp-text-meta)]"}`}>
        {label}
      </div>
      <input
        type="number"
        step="0.1"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-full bg-transparent font-tech text-[13px] text-[var(--pp-text-primary)] focus:outline-none"
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-[13px] text-[var(--pp-text-secondary)]">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className="relative h-[22px] w-[38px] rounded-full transition-colors duration-200"
        style={{
          background: checked ? "var(--pp-violet)" : "rgba(255,255,255,0.14)",
        }}
      >
        <span
          className="absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all duration-200"
          style={{ left: checked ? "19px" : "3px" }}
        />
      </button>
    </label>
  );
}
