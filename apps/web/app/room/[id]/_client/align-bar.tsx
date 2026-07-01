"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AxisSide } from "./types";

interface AlignBarProps {
  distributeEnabled: boolean;
  onAlignAxis: (axis: "x" | "y" | "z", side: AxisSide) => void;
  onDistribute: () => void;
}

const AXIS_GROUPS: {
  axis: "x" | "y" | "z";
  label: string;
  options: { side: Exclude<AxisSide, null>; icon: LucideIcon; title: string }[];
}[] = [
  {
    axis: "x",
    label: "X",
    options: [
      { side: "min", icon: AlignStartVertical, title: "Align left (min X)" },
      { side: "center", icon: AlignCenterVertical, title: "Align center X" },
      { side: "max", icon: AlignEndVertical, title: "Align right (max X)" },
    ],
  },
  {
    axis: "y",
    label: "Y",
    options: [
      { side: "min", icon: AlignEndHorizontal, title: "Align bottom (min Y)" },
      { side: "center", icon: AlignCenterHorizontal, title: "Align middle Y" },
      { side: "max", icon: AlignStartHorizontal, title: "Align top (max Y)" },
    ],
  },
  {
    axis: "z",
    label: "Z",
    options: [
      { side: "min", icon: AlignStartVertical, title: "Align back (min Z)" },
      { side: "center", icon: AlignCenterVertical, title: "Align center Z" },
      { side: "max", icon: AlignEndVertical, title: "Align front (max Z)" },
    ],
  },
];

const FLASH_MS = 220;

// Floating bottom-center pill: appears the moment 2+ objects are selected. Each
// button immediately moves every non-anchor selected object along that axis —
// there's no pending "apply" step like the old align tool had.
export function AlignBar({ distributeEnabled, onAlignAxis, onDistribute }: AlignBarProps) {
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  function flash(key: string) {
    setFlashKey(key);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashKey(null), FLASH_MS);
  }

  return (
    <div
      className="pp-panel absolute bottom-[150px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-[13px] p-[7px_9px]"
      style={{ boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}
    >
      {AXIS_GROUPS.map((group, i) => (
        <div key={group.axis} className="flex items-center gap-2">
          {i > 0 && <Divider />}
          <div className="flex items-center gap-1">
            <span className="px-0.5 font-tech text-[11px] text-[var(--pp-text-meta)]">
              {group.label}
            </span>
            {group.options.map(({ side, icon: Icon, title }) => {
              const key = `${group.axis}-${side}`;
              return (
                <button
                  key={key}
                  type="button"
                  title={title}
                  aria-label={title}
                  onClick={() => {
                    flash(key);
                    onAlignAxis(group.axis, side);
                  }}
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-[7px] transition-colors ${
                    flashKey === key
                      ? "bg-[var(--pp-violet-fill)] text-[var(--pp-violet-text)]"
                      : "text-[var(--pp-text-secondary)] hover:bg-[rgba(255,255,255,0.08)]"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.8} />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <Divider />

      <button
        type="button"
        title="Distribute evenly"
        aria-label="Distribute evenly"
        disabled={!distributeEnabled}
        onClick={() => {
          flash("distribute");
          onDistribute();
        }}
        className={`flex h-[30px] w-[30px] items-center justify-center rounded-[7px] transition-colors ${
          !distributeEnabled
            ? "cursor-not-allowed text-[var(--pp-text-meta)] opacity-40"
            : flashKey === "distribute"
              ? "bg-[var(--pp-violet-fill)] text-[var(--pp-violet-text)]"
              : "text-[var(--pp-text-secondary)] hover:bg-[rgba(255,255,255,0.08)]"
        }`}
      >
        <AlignHorizontalDistributeCenter size={16} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function Divider() {
  return <div className="h-6 w-px bg-[var(--pp-panel-border)]" />;
}
