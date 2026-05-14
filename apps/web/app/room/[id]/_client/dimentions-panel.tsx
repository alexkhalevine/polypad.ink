"use client";

import {PlacedBox, PlacedCylinder, PlacedSphere } from "@/app/room/[id]/_client/types";
import { useState } from "react";

function DimensionInput({
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
    <div className="flex flex-col items-center">
      <span className="text-xs text-blue-100 uppercase pb-1">{label}</span>
      <input
        type="number"
        step="0.1"
        min="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="input input-sm text-blue-700 font-mono"
      />
    </div>
  );
}

export function DimentionsPanel({ selectedObject, selectedObjectType, onDimensionCommit}: any) {
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
    </>
  );
}
