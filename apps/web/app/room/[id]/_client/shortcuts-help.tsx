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

  const items: [string, string][] = [
    ["S", "Select"],
    ["M", "Move"],
    ["A", "Align"],
    ["B", "Boolean"],
    ["C", "Clone"],
  ];

  return (
    <div className="absolute left-[76px] top-[72px] z-20" id="shortcuts-help">
      <div className="pp-panel w-44 rounded-[14px] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--pp-text-meta)]">
            Shortcuts
          </span>
          <button
            onClick={dismiss}
            className="text-[var(--pp-text-meta)] transition-colors hover:text-white"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
        <ul className="space-y-1.5 text-[13px] text-[var(--pp-text-secondary)]">
          {items.map(([key, label]) => (
            <li key={key} className="flex items-center gap-2">
              <kbd className="flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-[var(--pp-panel-border)] bg-[rgba(255,255,255,0.05)] px-1 font-tech text-[11px] text-[var(--pp-text-primary)]">
                {key}
              </kbd>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
