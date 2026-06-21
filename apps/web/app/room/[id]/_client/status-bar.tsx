"use client";

import { Minus, Plus, Maximize2 } from "lucide-react";
import { useRoomStore } from "./room-store";

interface StatusBarProps {
  selectedObjectCoords: string | null;
}

export function StatusBar({ selectedObjectCoords }: StatusBarProps) {
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);

  return (
    <div className="absolute bottom-[22px] left-4 z-20 flex items-center gap-2.5">
      {selectedObjectId && selectedObjectCoords && (
        <div className="pp-panel flex items-center gap-2 rounded-[12px] px-3 py-2 font-tech text-[12px] text-[var(--pp-text-muted)]">
          <span className="text-[var(--pp-mint)]">●</span>
          <span>1 selected</span>
          <span className="text-[var(--pp-text-meta)]">|</span>
          <span>{selectedObjectCoords}</span>
        </div>
      )}

      {/* Zoom controls — presentational. The viewport itself zooms via
          scroll / pinch through drei's OrbitControls. */}
      <div className="pp-panel flex items-center gap-1 rounded-[12px] p-1">
        <ZoomButton label="Zoom out" onClick={() => {}}>
          <Minus size={16} strokeWidth={2} />
        </ZoomButton>
        <span className="px-1 font-tech text-[12px] text-[var(--pp-text-secondary)]">
          100%
        </span>
        <ZoomButton label="Zoom in" onClick={() => {}}>
          <Plus size={16} strokeWidth={2} />
        </ZoomButton>
        <div className="mx-0.5 h-5 w-px bg-[var(--pp-panel-border)]" />
        <ZoomButton label="Fit to view" onClick={() => {}}>
          <Maximize2 size={15} strokeWidth={2} />
        </ZoomButton>
      </div>
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] text-[var(--pp-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
    >
      {children}
    </button>
  );
}
