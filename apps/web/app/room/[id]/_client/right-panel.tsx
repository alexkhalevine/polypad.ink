"use client";

import { useState, Children } from "react";

interface RightPanelProps {
  children?: React.ReactNode;
}

export function RightPanel({ children }: RightPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (Children.toArray(children).length === 0) return null;

  return (
    <div className="absolute right-0 top-28 z-20">
      <div
        className={`absolute rounded-sm border-l-2 border-t-2 border-b-2 border-teal-700 top-0 right-0 w-64 bg-indigo-950/95 backdrop-blur border-l border-indigo-800 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
