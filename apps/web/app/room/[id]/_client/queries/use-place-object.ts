import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./api-base";
import { roomKeys } from "./query-keys";
import type { WireObject } from "./wire-types";
import { ApiError } from "./api-error";
import { useErrorStore } from "@/app/error-store";

async function placeObject(roomId: string, object: WireObject): Promise<void> {
  const response = await fetch(`${API_BASE}/rooms/${roomId}/objects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(object),
  });
  if (!response.ok) {
    throw new ApiError("Failed to place object", response.status);
  }
}

export function usePlaceObject(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (object: WireObject) => placeObject(roomId, object),
    onError: (error: unknown) => {
      const status = error instanceof ApiError ? error.status : 0;
      const msg =
        status === 429
          ? "Too many requests. Please wait a moment and try again."
          : "Could not add object. Please try again.";
      useErrorStore.getState().addError(msg);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: roomKeys.objects(roomId) });
    },
  });
}
