"use client";

import { useEffect, useState } from "react";
import { UserPlus, Check } from "lucide-react";

export function InviteButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Copy invite link"
      title="Copy invite link to clipboard"
      className="flex items-center gap-1.5 rounded-[11px] bg-[var(--pp-mint)] px-[15px] py-2 font-display text-[13px] font-semibold text-[#072019] transition-colors hover:bg-[#6bf0d2]"
    >
      {copied ? <Check size={15} strokeWidth={2.5} /> : <UserPlus size={15} strokeWidth={2.2} />}
      {copied ? "Copied!" : "Invite"}
    </button>
  );
}
