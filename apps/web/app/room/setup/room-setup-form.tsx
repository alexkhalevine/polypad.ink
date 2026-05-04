"use client";

import { useActionState, useEffect } from "react";
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
    <form action={action} className="flex flex-col gap-6 items-center">
      <input type="hidden" name="token" value={token} />
      <input
        type="text"
        name="roomName"
        placeholder="room-name"
        className="input input-bordered w-full font-sans text-black"
        required
      />
      <button className="btn w-xs" type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Room"}
      </button>
    </form>
  );
}