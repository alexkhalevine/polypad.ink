"use client";

import { Box, Cylinder, Circle, Cone, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ToolType } from "./types";
import { useRoomStore } from "./room-store";

interface ShapeDockProps {
  onToolSelect: (tool: ToolType) => void;
}

const shapes: { name: ToolType; label: string; icon: LucideIcon }[] = [
  { name: "box", label: "Box", icon: Box },
  { name: "cylinder", label: "Cylinder", icon: Cylinder },
  { name: "sphere", label: "Sphere", icon: Circle },
];

export function ShapeDock({ onToolSelect }: ShapeDockProps) {
  const selectedTool = useRoomStore((s) => s.selectedTool);

  return (
    <div
      className="pp-panel absolute bottom-[22px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-[18px] p-2"
      style={{ boxShadow: "0 16px 50px rgba(0,0,0,0.5)" }}
    >
      <span className="px-2 font-display text-[11px] text-[var(--pp-text-meta)]">
        ADD
      </span>
      {shapes.map((s) => (
        <DockButton
          key={s.name}
          icon={s.icon}
          label={s.label}
          active={selectedTool === s.name}
          onClick={() => onToolSelect(s.name)}
        />
      ))}
      <DockButton icon={Cone} label="Cone" disabled onClick={() => {}} />
      <div className="mx-1 h-8 w-px bg-[var(--pp-panel-border)]" />
      <button
        type="button"
        title="More shapes"
        aria-label="More shapes"
        disabled
        className="flex h-[50px] w-[42px] cursor-not-allowed items-center justify-center rounded-[12px] text-[var(--pp-text-secondary)] opacity-40"
      >
        <Plus size={20} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function DockButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-w-[62px] flex-col items-center gap-1 rounded-[12px] px-2 py-2 transition-colors ${
        active
          ? "bg-[var(--pp-violet-fill)] text-[var(--pp-violet-text)]"
          : "text-[var(--pp-text-secondary)] hover:bg-[rgba(255,255,255,0.07)] hover:text-white"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <Icon size={20} strokeWidth={1.8} />
      <span className="font-display text-[11px]">{label}</span>
    </button>
  );
}
