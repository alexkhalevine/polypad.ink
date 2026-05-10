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
        className="menu rounded-box shadow-sm w-44 p-1 fixed z-50 bg-indigo-950 shadow-indigo-500"
        style={{ left: x, top: y }}
      >
        <li>
          <button onClick={handleSelectObject} className="font-medium text-lg text-indigo-200 hover:text-amber-300">Select object</button>
        </li>
        <li>
          <button
            onClick={handleMoveObject}
            disabled={!selectedObjectId}
            className="font-medium text-lg text-indigo-200 hover:text-amber-300 disabled:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-indigo-400"
          >
            Move object
          </button>
        </li>
      </ul>
    </>
  );
}
