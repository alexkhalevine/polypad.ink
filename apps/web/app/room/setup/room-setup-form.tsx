"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { setupRoom } from "./actions";
import { useErrorStore } from "@/app/error-store";

export function RoomSetupForm({ token }: { token: string }) {
  const [state, action, isPending] = useActionState(setupRoom, null);

  useEffect(() => {
    if (state?.error) {
      useErrorStore.getState().addError(state.error);
    }
  }, [state]);

  return (
    <div className="pp-panel mt-9 w-full rounded-[20px] p-6 text-left">
      <span className="font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--pp-text-meta)]">
        Name your room
      </span>

      <form action={action} className="mt-3 flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />

        {/* Input row with muted prefix + blinking caret */}
        <label className="flex h-[50px] items-center gap-1 rounded-[12px] border border-[rgba(139,109,255,0.4)] bg-[rgba(255,255,255,0.04)] px-[14px] focus-within:border-[var(--pp-violet)]">
          <span className="font-tech text-[14px] text-[var(--pp-text-meta)]">
            polypad.io/
          </span>
          <input
            type="text"
            name="roomName"
            placeholder="studio-lamp"
            required
            autoFocus
            className="peer min-w-0 flex-1 bg-transparent font-tech text-[14px] text-[var(--pp-text-primary)] placeholder:text-[var(--pp-text-meta)] focus:outline-none"
          />
          <span className="pp-caret h-[18px] w-[2px] shrink-0 bg-[var(--pp-violet)] peer-focus:hidden" />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] font-display text-[15px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-70"
          style={{ background: "var(--pp-violet-grad)" }}
        >
          {isPending ? "Creating…" : "Create Room"}
          {!isPending && <ArrowRight size={18} strokeWidth={2.5} />}
        </button>
      </form>

      {/* "or" divider */}
      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--pp-panel-border)]" />
        <span className="font-display text-[12px] text-[var(--pp-text-meta)]">
          or
        </span>
        <span className="h-px flex-1 bg-[var(--pp-panel-border)]" />
      </div>

      <Link
        href="/"
        className="flex h-[46px] w-full items-center justify-center rounded-[12px] border border-[rgba(255,255,255,0.12)] font-display text-[15px] text-[var(--pp-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-white"
      >
        Join with a room code
      </Link>
    </div>
  );
}
