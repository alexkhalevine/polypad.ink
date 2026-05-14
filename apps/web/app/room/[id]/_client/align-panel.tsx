"use client";

import { useRoomStore } from "./room-store";
import { AxisSide } from "./types";

interface AlignPanelProps {
  onApply: () => void;
  onCancel: () => void;
}

const AXES = [
  {
    key: "x" as const,
    label: "Horizontal",
    hint: "X",
    options: [
      { side: "min" as AxisSide, label: "Left" },
      { side: "center" as AxisSide, label: "Center" },
      { side: "max" as AxisSide, label: "Right" },
    ],
  },
  {
    key: "y" as const,
    label: "Vertical",
    hint: "Y",
    options: [
      { side: "min" as AxisSide, label: "Bottom" },
      { side: "center" as AxisSide, label: "Middle" },
      { side: "max" as AxisSide, label: "Top" },
    ],
  },
  {
    key: "z" as const,
    label: "Depth",
    hint: "Z",
    options: [
      { side: "min" as AxisSide, label: "Back" },
      { side: "center" as AxisSide, label: "Center" },
      { side: "max" as AxisSide, label: "Front" },
    ],
  },
];

export function AlignPanel({ onApply, onCancel }: AlignPanelProps) {
  const alignTargetId = useRoomStore((s) => s.alignTargetId);
  const alignXSide = useRoomStore((s) => s.alignXSide);
  const alignYSide = useRoomStore((s) => s.alignYSide);
  const alignZSide = useRoomStore((s) => s.alignZSide);
  const setAlignXSide = useRoomStore((s) => s.setAlignXSide);
  const setAlignYSide = useRoomStore((s) => s.setAlignYSide);
  const setAlignZSide = useRoomStore((s) => s.setAlignZSide);

  const sides = { x: alignXSide, y: alignYSide, z: alignZSide };
  const setters = { x: setAlignXSide, y: setAlignYSide, z: setAlignZSide };

  const hasTarget = alignTargetId !== null;
  const hasAxis = alignXSide !== null || alignYSide !== null || alignZSide !== null;
  const canApply = hasTarget && hasAxis;

  function toggle(axis: "x" | "y" | "z", side: AxisSide) {
    const current = sides[axis];
    setters[axis](current === side ? null : side);
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-sm text-indigo-200">Align to Object</h3>

      <p className="text-xs font-mono leading-snug">
        {hasTarget ? (
          <span className="text-emerald-400">Target selected ✓</span>
        ) : (
          <span className="text-indigo-400">Click a target object</span>
        )}
      </p>

      <div className="flex flex-col gap-3">
        {AXES.map(({ key, label, hint, options }) => (
          <div key={key}>
            <p className="text-xs text-indigo-400 mb-1.5">
              {label}{" "}
              <span className="opacity-50 font-mono">{hint}</span>
            </p>
            <div className="flex gap-1">
              {options.map(({ side, label: optLabel }) => {
                const active = sides[key] === side;
                return (
                  <button
                    key={optLabel}
                    onClick={() => toggle(key, side)}
                    className={`flex-1 text-xs py-1 rounded border transition-colors ${
                      active
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-indigo-900 border-indigo-700 text-indigo-300 hover:bg-indigo-800"
                    }`}
                  >
                    {optLabel}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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

      <p className="text-xs text-indigo-600 font-mono text-center leading-snug">
        Enter to apply · Esc to cancel
      </p>
    </div>
  );
}
