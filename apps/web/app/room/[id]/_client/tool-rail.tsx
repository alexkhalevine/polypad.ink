"use client";

import { MousePointer2, Move, RotateCw, Maximize, Orbit } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRoomStore } from "./room-store";

interface ToolRailProps {
  onSelectClick: () => void;
}

type RailButton = {
  key: string;
  icon: LucideIcon;
  label: string;
  shortcut: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
};

export function ToolRail({ onSelectClick }: ToolRailProps) {
  const selectedTool = useRoomStore((s) => s.selectedTool);
  const selectionMode = useRoomStore((s) => s.selectionMode);
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const setSelectedTool = useRoomStore((s) => s.setSelectedTool);

  const noop = () => {};

  const buttons: RailButton[] = [
    {
      key: "select",
      icon: MousePointer2,
      label: "Select",
      shortcut: "S",
      active: selectionMode === "select",
      disabled: false,
      onClick: onSelectClick,
    },
    {
      key: "move",
      icon: Move,
      label: "Move",
      shortcut: "M",
      active: selectedTool === "move",
      disabled: !selectedObjectId,
      onClick: () => selectedObjectId && setSelectedTool("move"),
    },
    {
      key: "rotate",
      icon: RotateCw,
      label: "Rotate",
      shortcut: "R",
      active: selectedTool === "rotate",
      disabled: !selectedObjectId,
      onClick: () => selectedObjectId && setSelectedTool("rotate"),
    },
    {
      key: "scale",
      icon: Maximize,
      label: "Scale",
      shortcut: "E",
      active: false,
      disabled: true,
      onClick: noop,
    },
  ];

  return (
    <div className="pp-panel absolute left-4 top-[72px] z-20 flex flex-col gap-1 rounded-[16px] p-1.5">
      {buttons.map(({ key, ...b }) => (
        <RailIconButton key={key} {...b} />
      ))}
      <div className="mx-2 my-1 h-px bg-[var(--pp-panel-border)]" />
      <RailIconButton
        icon={Orbit}
        label="Orbit camera"
        shortcut="C"
        active={false}
        disabled={false}
        onClick={() => {}}
        title="Orbit camera — drag in the viewport to orbit"
      />
    </div>
  );
}

function RailIconButton({
  icon: Icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
  title,
}: Omit<RailButton, "key"> & { title?: string }) {
  return (
    <button
      type="button"
      title={title ?? `${label} (${shortcut})`}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-[12px] border transition-colors ${
        active
          ? "border-[var(--pp-violet-border)] bg-[var(--pp-violet-fill)] text-[var(--pp-violet-text)]"
          : "border-transparent text-[#b9b9c6] hover:bg-[rgba(255,255,255,0.06)]"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <Icon size={19} strokeWidth={1.8} />
    </button>
  );
}
