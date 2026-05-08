"use client";

import { Html } from "@react-three/drei";
import { useRoomStore } from "./room-store";

const CURSOR_COLORS = ["#38bdf8", "#fb923c", "#a78bfa", "#34d399", "#f472b6", "#facc15"];

function CursorSVG({ color }: { color: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))", pointerEvents: "none" }}
    >
      <polygon fill={color} points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6" />
      <polygon fill={color} points="17.3,21.6 13.7,23.1 9,12 12.7,10.5" />
      <rect
        x="12.5"
        y="13.6"
        transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)"
        width="2"
        height="8"
        fill={color}
      />
      <polygon fill="#000" fillOpacity="0.35" points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5" />
    </svg>
  );
}

export function RemoteCursors() {
  const remoteUsers = useRoomStore((s) => s.remoteUsers);

  return (
    <>
      {Object.entries(remoteUsers).map(([userId, presence], index) => {
        if (!presence.cursor) return null;
        const { x, y, z } = presence.cursor;
        const color = CURSOR_COLORS[index % CURSOR_COLORS.length];

        return (
          <Html key={userId} position={[x, y + 0.01, z]} pointerEvents="none">
            <div style={{ pointerEvents: "none", userSelect: "none" }}>
              <CursorSVG color={color} />
              <div
                style={{
                  marginTop: 2,
                  marginLeft: 4,
                  fontSize: 11,
                  fontFamily: "sans-serif",
                  color: "#fff",
                  background: color,
                  borderRadius: 3,
                  padding: "1px 5px",
                  whiteSpace: "nowrap",
                  lineHeight: "16px",
                }}
              >
                {presence.displayName}
              </div>
            </div>
          </Html>
        );
      })}
    </>
  );
}
