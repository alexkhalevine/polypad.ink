"use client";

import { PlacedBox, PlacedCylinder, PlacedSphere, PlacedMesh } from "@/app/room/[id]/_client/types";
import { computeBoundingSize } from "@/app/room/[id]/_client/csg-utils";
import { useState } from "react";

function DimensionInput({
  label,
  value,
  onCommit,
  readOnly = false,
}: {
  label: string;
  value: number;
  onCommit?: (next: number) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState(value.toFixed(2));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value.toFixed(2));
  }

  const commit = () => {
    if (readOnly) return;
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDraft(value.toFixed(2));
      return;
    }
    if (parsed !== value) onCommit?.(parsed);
  };

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-blue-100 uppercase pb-1">{label}</span>
      <input
        type="number"
        step="0.1"
        min="0.01"
        value={readOnly ? value.toFixed(2) : draft}
        disabled={readOnly}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="input input-sm text-blue-700 font-mono disabled:opacity-60"
      />
    </div>
  );
}

export function DimentionsPanel({
  selectedObject,
  selectedObjectType,
  onDimensionCommit,
}: {
  selectedObject: PlacedBox | PlacedCylinder | PlacedSphere | PlacedMesh | null;
  selectedObjectType: "box" | "cylinder" | "sphere" | "mesh" | null;
  onDimensionCommit: (field: "width" | "height" | "depth" | "radius", value: number) => void;
}) {
  return (
    <>
      {selectedObjectType === "box" && (
        <div className="flex gap-2">
          <DimensionInput
            label="Width"
            value={(selectedObject as PlacedBox).width}
            onCommit={(next) => onDimensionCommit("width", next)}
          />
          <DimensionInput
            label="Height"
            value={(selectedObject as PlacedBox).height}
            onCommit={(next) => onDimensionCommit("height", next)}
          />
          <DimensionInput
            label="Depth"
            value={(selectedObject as PlacedBox).depth}
            onCommit={(next) => onDimensionCommit("depth", next)}
          />
        </div>
      )}
      {selectedObjectType === "cylinder" && (
        <div className="flex gap-2 items-center">
          <DimensionInput
            label="R"
            value={(selectedObject as PlacedCylinder).radius}
            onCommit={(next) => onDimensionCommit("radius", next)}
          />
          <DimensionInput
            label="H"
            value={(selectedObject as PlacedCylinder).height}
            onCommit={(next) => onDimensionCommit("height", next)}
          />
        </div>
      )}
      {selectedObjectType === "sphere" && (
        <div className="flex gap-2 items-center">
          <DimensionInput
            label="R"
            value={(selectedObject as PlacedSphere).radius}
            onCommit={(next) => onDimensionCommit("radius", next)}
          />
        </div>
      )}
      {selectedObjectType === "mesh" && (() => {
        const size = computeBoundingSize((selectedObject as PlacedMesh).positions);
        return (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <DimensionInput label="W" value={size.x} readOnly />
              <DimensionInput label="H" value={size.y} readOnly />
              <DimensionInput label="D" value={size.z} readOnly />
            </div>
            <span className="text-[10px] text-blue-200 opacity-70">bounding box (read-only)</span>
          </div>
        );
      })()}
    </>
  );
}
