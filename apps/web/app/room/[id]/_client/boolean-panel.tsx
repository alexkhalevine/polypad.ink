"use client";

import { useRoomStore } from "./room-store";
import { BooleanThumbnail } from "./boolean-thumbnail";
import type { AnyShape, ShapeKind } from "./csg-utils";
import type { BooleanOperation } from "./types";

interface BooleanPanelProps {
  source: AnyShape | null;
  sourceKind: ShapeKind | null;
  target: AnyShape | null;
  targetKind: ShapeKind | null;
  onApply: () => void;
  onCancel: () => void;
}

const OPERATIONS: { op: BooleanOperation; label: string; symbol: string; key: string }[] = [
  { op: "ADDITION", label: "Union", symbol: "A ∪ B", key: "1" },
  { op: "SUBTRACTION", label: "A − B", symbol: "A − B", key: "2" },
  { op: "REVERSE_SUBTRACTION", label: "B − A", symbol: "B − A", key: "3" },
  { op: "DIFFERENCE", label: "Xor", symbol: "A ⊕ B", key: "4" },
  { op: "INTERSECTION", label: "Intersect", symbol: "A ∩ B", key: "5" },
];

const PREVIEW_COLOR = "#2f74c0";

export function BooleanPanel({
  source,
  sourceKind,
  target,
  targetKind,
  onApply,
  onCancel,
}: BooleanPanelProps) {
  const booleanOperation = useRoomStore((s) => s.booleanOperation);
  const setBooleanOperation = useRoomStore((s) => s.setBooleanOperation);
  const hasTarget = target !== null && targetKind !== null;
  const canApply = source !== null && sourceKind !== null && hasTarget;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-sm text-indigo-200">Boolean Operation</h3>

      <p className="text-xs font-mono leading-snug">
        {hasTarget ? (
          <span className="text-emerald-400">Target selected ✓</span>
        ) : (
          <span className="text-indigo-400">Click a target object</span>
        )}
      </p>

      <div className="grid grid-cols-5 gap-1.5">
        {OPERATIONS.map(({ op, label, symbol, key }) => {
          const active = booleanOperation === op;
          return (
            <button
              key={op}
              onClick={() => setBooleanOperation(op)}
              className={`flex flex-col items-stretch gap-1 p-1 rounded border transition-colors ${
                active
                  ? "bg-blue-600/30 border-blue-400"
                  : "bg-indigo-900 border-indigo-700 hover:bg-indigo-800"
              }`}
              title={`${label} (${key})`}
            >
              {canApply ? (
                <BooleanThumbnail
                  source={source!}
                  sourceKind={sourceKind!}
                  target={target!}
                  targetKind={targetKind!}
                  op={op}
                  color={PREVIEW_COLOR}
                />
              ) : (
                <div className="w-full h-12 bg-indigo-950 rounded-sm" />
              )}
              <span
                className={`text-[10px] font-mono text-center ${
                  active ? "text-blue-200" : "text-indigo-400"
                }`}
              >
                {symbol}
              </span>
            </button>
          );
        })}
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
        1–5 to pick op · Enter to apply · Esc to cancel
      </p>
    </div>
  );
}
