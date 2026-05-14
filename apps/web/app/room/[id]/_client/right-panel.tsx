"use client";

import { useState } from "react";

interface RightPanelProps {
  children?: React.ReactNode;
}

export function RightPanel({ children }: RightPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="absolute right-0 top-16 z-20">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="absolute top-2 right-0 -translate-x-full rounded-l-md bg-indigo-900 border border-r-0 border-indigo-700 text-indigo-200 hover:bg-indigo-800 px-1.5 py-3 text-xs leading-none"
      >
        {isOpen ? "❯" : "❮"}
      </button>

      <div
        className={`absolute top-0 right-0 w-64 bg-indigo-950/95 backdrop-blur border-l border-indigo-800 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
