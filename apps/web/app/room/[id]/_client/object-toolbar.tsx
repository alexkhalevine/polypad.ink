"use client";

import {
  Combine,
  Copy,
  Group,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRoomStore } from "./room-store";

interface ObjectToolbarProps {
  onDelete: () => void;
}

export function ObjectToolbar({ onDelete }: ObjectToolbarProps) {
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const selectedTool = useRoomStore((s) => s.selectedTool);
  const setSelectedTool = useRoomStore((s) => s.setSelectedTool);

  if (!selectedObjectId) return null;

  return (
    <div
      className="pp-panel absolute left-1/2 top-[18%] z-30 flex -translate-x-1/2 items-center gap-1 rounded-[14px] p-1.5"
      style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
    >
      <Chip
        icon={Combine}
        label="Boolean (B)"
        active={selectedTool === "boolean"}
        onClick={() => setSelectedTool("boolean")}
      />
      <Chip
        icon={Copy}
        label="Duplicate (C)"
        active={selectedTool === "clone"}
        onClick={() => setSelectedTool("clone")}
      />
      <Chip icon={Group} label="Group" disabled onClick={() => {}} />
      <div className="mx-1 h-6 w-px bg-[var(--pp-panel-border)]" />
      <Chip icon={Trash2} label="Delete" danger onClick={onDelete} />
    </div>
  );
}

function Chip({
  icon: Icon,
  label,
  active,
  disabled,
  danger,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  const base =
    "flex h-[38px] w-[38px] items-center justify-center rounded-[9px] transition-colors";
  const tone = danger
    ? "text-[var(--pp-danger-soft)] hover:bg-[rgba(255,90,90,0.15)] hover:text-[var(--pp-danger)]"
    : active
      ? "bg-[var(--pp-violet-fill)] text-[var(--pp-violet-text)]"
      : "text-[var(--pp-text-secondary)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${tone} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <Icon size={18} strokeWidth={1.8} />
    </button>
  );
}
