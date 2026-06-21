"use client";

import { Download } from "lucide-react";
import { InviteButton } from "./invite-button";
import { UserAvatars } from "./user-avatars";

interface TopBarProps {
  roomName: string;
  onExport: () => void;
}

export function TopBar({ roomName, onExport }: TopBarProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-30 flex h-[60px] items-center justify-between px-[18px]">
      {/* Left: wordmark + room pill */}
      <div className="flex items-center gap-3">
        <span className="text-gradient font-display text-[21px] font-bold tracking-[-0.03em]">
          polypad
        </span>
        <span className="h-5 w-px bg-[var(--pp-panel-border)]" />
        <div className="flex items-center gap-2 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5">
          <span className="pp-live-dot inline-block h-2 w-2 rounded-full bg-[var(--pp-mint)]" />
          <span className="font-tech text-[13px] text-[var(--pp-text-secondary)]">
            {roomName}
          </span>
        </div>
      </div>

      {/* Right: presence + invite + export */}
      <div className="flex items-center gap-3">
        <UserAvatars />
        <InviteButton />
        <button
          type="button"
          onClick={onExport}
          title="Export model"
          className="flex items-center gap-1.5 rounded-[11px] border border-[rgba(139,109,255,0.5)] bg-[rgba(139,109,255,0.12)] px-[15px] py-2 font-display text-[13px] font-semibold text-[var(--pp-violet-text)] transition-colors hover:bg-[rgba(139,109,255,0.22)]"
        >
          <Download size={15} strokeWidth={2.2} />
          Export
        </button>
      </div>
    </div>
  );
}
