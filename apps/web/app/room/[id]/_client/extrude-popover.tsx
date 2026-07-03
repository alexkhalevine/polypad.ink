"use client";

import { useState } from "react";

interface ExtrudePopoverProps {
  depth: number;
  onDepthChange: (depth: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// Appears during the extrude tool's depth phase. The depth value tracks the
// live drag; it's also directly editable for precision. Positive pulls the
// rect outward (union), negative pushes a pocket inward (subtraction).
export function ExtrudePopover({ depth, onDepthChange, onConfirm, onCancel }: ExtrudePopoverProps) {
  const [draft, setDraft] = useState(depth.toFixed(2));
  const [lastDepth, setLastDepth] = useState(depth);
  // Keep the input following the drag, without fighting the user mid-edit
  // (same lastValue-sync pattern as the inspector's Field inputs).
  if (depth !== lastDepth) {
    setLastDepth(depth);
    setDraft(depth.toFixed(2));
  }

  function commitDraft() {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(depth.toFixed(2));
      return;
    }
    onDepthChange(parsed);
  }

  return (
    <div
      className="pp-panel absolute bottom-[150px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-[13px] p-[7px_9px]"
      style={{ boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}
    >
      <div className="flex items-center gap-1.5 px-1">
        <span className="font-tech text-[11px] text-[var(--pp-text-meta)]">depth</span>
        <input
          type="number"
          step="0.1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-16 rounded-[6px] bg-[rgba(255,255,255,0.04)] px-1.5 py-1 text-center font-tech text-[12px] text-[var(--pp-text-primary)] focus:outline-none"
        />
        <span className="font-tech text-[11px] text-[var(--pp-text-meta)]">+ out / − in</span>
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
