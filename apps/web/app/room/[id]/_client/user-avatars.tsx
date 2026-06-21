"use client";

import { useEffect, useState } from "react";
import { useRoomStore } from "./room-store";
import { getDisplayName } from "./realtime/socket";

const CURSOR_COLORS = ["#38bdf8", "#fb923c", "#a78bfa", "#34d399", "#f472b6", "#facc15"];
const LOCAL_GRADIENT = "linear-gradient(135deg, #8b6dff, #a06bff)";

export function UserAvatars() {
  const remoteUsers = useRoomStore((s) => s.remoteUsers);
  // Display name lives in localStorage, so it's only available after mount.
  // Reading it during SSR/first render would cause a hydration mismatch.
  const [localName, setLocalName] = useState<string | null>(null);
  useEffect(() => {
    setLocalName(getDisplayName());
  }, []);

  const remoteEntries = Object.entries(remoteUsers);

  return (
    <div className="flex items-center pl-2">
      {localName && (
        <Avatar
          letter={localName[0].toUpperCase()}
          name={localName}
          background={LOCAL_GRADIENT}
        />
      )}
      {remoteEntries.map(([userId, presence], index) => (
        <Avatar
          key={userId}
          letter={presence.displayName[0].toUpperCase()}
          name={presence.displayName}
          background={CURSOR_COLORS[index % CURSOR_COLORS.length]}
        />
      ))}
    </div>
  );
}

function Avatar({
  letter,
  name,
  background,
}: {
  letter: string;
  name: string;
  background: string;
}) {
  return (
    <div
      title={name}
      className="-ml-[9px] flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-[#0c0b12] text-[12px] font-semibold text-white first:ml-0"
      style={{ background }}
    >
      {letter}
    </div>
  );
}
