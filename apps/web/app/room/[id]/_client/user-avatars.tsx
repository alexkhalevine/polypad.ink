"use client";

import { useRoomStore } from "./room-store";
import { getDisplayName } from "./realtime/socket";

const CURSOR_COLORS = ["#38bdf8", "#fb923c", "#a78bfa", "#34d399", "#f472b6", "#facc15"];
const LOCAL_COLOR = "#6366f1";

export function UserAvatars() {
  const remoteUsers = useRoomStore((s) => s.remoteUsers);
  const localName = getDisplayName();

  const remoteEntries = Object.entries(remoteUsers);

  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center gap-1">
        <div className="avatar avatar-placeholder">
          <div
            className="w-10 rounded-full text-white"
            style={{ backgroundColor: LOCAL_COLOR }}
          >
            <span className="text-sm">{localName[0].toUpperCase()}</span>
          </div>
        </div>
        <span className="text-xs text-white/70 whitespace-nowrap">{localName}</span>
      </div>

      {remoteEntries.map(([userId, presence], index) => {
        const color = CURSOR_COLORS[index % CURSOR_COLORS.length];
        return (
          <div key={userId} className="flex flex-col items-center gap-1">
            <div className="avatar avatar-placeholder">
              <div
                className="w-10 rounded-full text-white"
                style={{ backgroundColor: color }}
              >
                <span className="text-sm">{presence.displayName[0].toUpperCase()}</span>
              </div>
            </div>
            <span className="text-xs text-white/70 whitespace-nowrap">{presence.displayName}</span>
          </div>
        );
      })}
    </div>
  );
}
