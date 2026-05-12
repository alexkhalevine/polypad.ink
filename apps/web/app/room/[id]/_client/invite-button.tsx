"use client";

import { useEffect, useState } from "react";

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
      className="btn btn-sm btn-primary"
      aria-label="Copy invite link"
      title="Copy invite link to clipboard"
    >
      {copied ? "Copied!" : "Invite"}
    </button>
  );
}
