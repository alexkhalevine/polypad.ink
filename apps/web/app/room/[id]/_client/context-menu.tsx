"use client";

import { useEffect } from "react";
import { useRoomStore } from "./room-store";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const setSelectionMode = useRoomStore((s) => s.setSelectionMode);
  const setSelectedTool = useRoomStore((s) => s.setSelectedTool);
  const setSelectedObjectId = useRoomStore((s) => s.setSelectedObjectId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleSelectObject() {
    setSelectionMode("select");
    setSelectedTool(null);
    setSelectedObjectId(null);
    onClose();
  }

  function handleMoveObject() {
    if (!selectedObjectId) return;
    setSelectedTool("move");
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <ul
        className="menu bg-base-200 rounded-box shadow-lg w-44 p-1 fixed z-50"
        style={{ left: x, top: y }}
      >
        <li>
          <button onClick={handleSelectObject}>select object</button>
        </li>
        <li>
          <button onClick={handleMoveObject} disabled={!selectedObjectId}>
            move object
          </button>
        </li>
      </ul>
    </>
  );
}
