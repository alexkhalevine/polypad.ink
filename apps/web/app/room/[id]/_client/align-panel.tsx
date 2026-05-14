"use client";

import { useRoomStore } from "./room-store";

type Side = "min" | "max";
type Axes = { x: boolean; y: boolean; z: boolean };

interface AlignPanelProps {
  onApply: () => void;
  onCancel: () => void;
}

export function AlignPanel({ onApply, onCancel }: AlignPanelProps) {
  const axes = useRoomStore((s) => s.alignAxes);
  const sourceSide = useRoomStore((s) => s.alignSourceSide);
  const targetSide = useRoomStore((s) => s.alignTargetSide);
  const alignTargetId = useRoomStore((s) => s.alignTargetId);
  const setAxes = useRoomStore((s) => s.setAlignAxes);
  const setSourceSide = useRoomStore((s) => s.setAlignSourceSide);
  const setTargetSide = useRoomStore((s) => s.setAlignTargetSide);

  const axisLabels: (keyof Axes)[] = ["x", "y", "z"];
  const hasTarget = alignTargetId !== null;
  const canApply = hasTarget && (axes.x || axes.y || axes.z);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-sm text-indigo-200">Align Position</h3>

      {!hasTarget && (
        <p className="text-xs text-indigo-400 font-mono">
          Drag to a target object
        </p>
      )}

      <div>
        <p className="text-xs text-indigo-400 uppercase mb-2">Axes</p>
        <div className="flex gap-3">
          {axisLabels.map((axis) => (
            <label key={axis} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={axes[axis]}
                onChange={(e) => setAxes({ ...axes, [axis]: e.target.checked })}
                className="checkbox checkbox-xs border-indigo-500"
              />
              <span className="text-xs font-mono uppercase text-indigo-200">{axis}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-indigo-400 uppercase mb-1.5">Source</p>
          <div className="flex flex-col gap-1">
            {(["min", "max"] as Side[]).map((side) => (
              <label key={side} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="align-source-side"
                  checked={sourceSide === side}
                  onChange={() => setSourceSide(side)}
                  className="radio radio-xs border-indigo-500"
                />
                <span className="text-xs text-indigo-200 capitalize">
                  {side === "min" ? "Minimum" : "Maximum"}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-indigo-400 uppercase mb-1.5">Target</p>
          <div className="flex flex-col gap-1">
            {(["min", "max"] as Side[]).map((side) => (
              <label key={side} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="align-target-side"
                  checked={targetSide === side}
                  onChange={() => setTargetSide(side)}
                  className="radio radio-xs border-indigo-500"
                />
                <span className="text-xs text-indigo-200 capitalize">
                  {side === "min" ? "Minimum" : "Maximum"}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="btn btn-xs bg-indigo-800 text-indigo-200 border-indigo-700 hover:bg-indigo-700 flex-1"
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          disabled={!canApply}
          className="btn btn-xs bg-blue-700 text-blue-100 border-blue-600 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed flex-1"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
