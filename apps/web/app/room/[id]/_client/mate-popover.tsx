"use client";

import { useState } from "react";
import { MateMode } from "./types";

interface MatePopoverProps {
  mode: MateMode;
  offset: number;
  onModeChange: (mode: MateMode) => void;
  onOffsetChange: (offset: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const MODES: { mode: MateMode; label: string }[] = [
  { mode: "flush", label: "Flush" },
  { mode: "center", label: "Center" },
  { mode: "gap", label: "Gap" },
];

// Appears once both a source and target face are picked. Mirrors the Align
// Bar's pill surface; Enter / click-empty-canvas confirms, Esc cancels (wired
// in use-room-editor.ts's keyboard handler / resetEditorState).
export function MatePopover({ mode, offset, onModeChange, onOffsetChange, onConfirm, onCancel }: MatePopoverProps) {
  const [draft, setDraft] = useState(offset.toFixed(2));

  function commitOffset() {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(offset.toFixed(2));
      return;
    }
    onOffsetChange(parsed);
  }

  return (
    <div
      className="pp-panel absolute bottom-[150px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-[13px] p-[7px_9px]"
      style={{ boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}
    >
      <div className="flex items-center gap-1">
        {MODES.map(({ mode: m, label }) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`rounded-[7px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
              mode === m
                ? "bg-[var(--pp-violet-fill)] text-[var(--pp-violet-text)] border border-[var(--pp-violet-border)]"
                : "border border-transparent text-[var(--pp-text-secondary)] hover:bg-[rgba(255,255,255,0.08)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-[var(--pp-panel-border)]" />

      <div className="flex items-center gap-1.5 px-1">
        <span className="font-tech text-[11px] text-[var(--pp-text-meta)]">offset</span>
        <input
          type="number"
          step="0.1"
          value={draft}
          disabled={mode !== "gap"}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitOffset}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-14 rounded-[6px] bg-[rgba(255,255,255,0.04)] px-1.5 py-1 text-center font-tech text-[12px] text-[var(--pp-text-primary)] focus:outline-none disabled:opacity-40"
        />
      </div>

      <div className="h-6 w-px bg-[var(--pp-panel-border)]" />

      <button
        type="button"
        onClick={onCancel}
        title="Cancel (Esc)"
        className="rounded-[7px] px-2.5 py-1.5 text-[12px] text-[var(--pp-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        title="Confirm (Enter)"
        className="rounded-[7px] bg-[var(--pp-violet-fill)] px-3 py-1.5 text-[12px] font-medium text-[var(--pp-violet-text)] transition-colors hover:bg-[rgba(139,109,255,0.28)]"
      >
        Confirm
      </button>
    </div>
  );
}
