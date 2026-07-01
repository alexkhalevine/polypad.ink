"use client";

import { Minus, Plus, Maximize2, Minimize2 } from "lucide-react";
import { useRoomStore } from "./room-store";

interface StatusBarProps {
  selectedObjectCoords: string | null;
  selectedCount?: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function StatusBar({ selectedObjectCoords, selectedCount = 0, isFullscreen, onToggleFullscreen }: StatusBarProps) {
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const zoomLevel = useRoomStore((s) => s.zoomLevel);
  const zoomIn = useRoomStore((s) => s.zoomIn);
  const zoomOut = useRoomStore((s) => s.zoomOut);

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
      {selectedCount >= 2 && (
        <div className="pp-panel flex items-center gap-2 rounded-[12px] px-3 py-2 font-tech text-[12px] text-[var(--pp-text-muted)]">
          <span className="text-[var(--pp-violet-text)]">●</span>
          <span>{selectedCount} selected</span>
        </div>
      )}

      <div className="pp-panel flex items-center gap-1 rounded-[12px] p-1">
        <ZoomButton label="Zoom out" onClick={zoomOut}>
          <Minus size={16} strokeWidth={2} />
        </ZoomButton>
        <span className="px-1 font-tech text-[12px] text-[var(--pp-text-secondary)]">
          {zoomLevel}%
        </span>
        <ZoomButton label="Zoom in" onClick={zoomIn}>
          <Plus size={16} strokeWidth={2} />
        </ZoomButton>
        <div className="mx-0.5 h-5 w-px bg-[var(--pp-panel-border)]" />
        <ZoomButton
          label={isFullscreen ? "Exit full screen" : "Full screen"}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 size={15} strokeWidth={2} />
          ) : (
            <Maximize2 size={15} strokeWidth={2} />
          )}
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
