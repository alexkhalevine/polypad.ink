"use client";
import { useSyncExternalStore } from "react";

// Module-level subscriber set so the dismiss action can notify the store.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

const getSnapshot = () => !localStorage.getItem("shortcuts-help-dismissed");
const getServerSnapshot = () => false;

export const ShortcutsHelp = () => {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem("shortcuts-help-dismissed", "1");
    listeners.forEach((cb) => cb());
  };

  return (
    <div className="absolute left-3 top-40 z-10" id="shortcuts-help">
      <div className="bg-base-200 border border-base-300 rounded-lg p-3 w-44 shadow-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Shortcuts</span>
          <button onClick={dismiss} className="btn btn-xs btn-circle text-base-content/60 hover:text-base-content" aria-label="Dismiss">✕</button>
        </div>
        <ul className="space-y-1 text-sm text-base-content">
          <li className="flex items-center gap-2"><kbd className="kbd kbd-xs">S</kbd> Select</li>
          <li className="flex items-center gap-2"><kbd className="kbd kbd-xs">M</kbd> Move</li>
          <li className="flex items-center gap-2"><kbd className="kbd kbd-xs">A</kbd> Align</li>
        </ul>
      </div>
    </div>
  );
};
