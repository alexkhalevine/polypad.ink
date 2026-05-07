import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./api-base";
import { roomKeys } from "./query-keys";
import { ApiError } from "./api-error";
import { useErrorStore } from "@/app/error-store";
import { jsonHeaders } from "./api-headers";

async function updateObjectColor(roomId: string, objectId: string, color: string): Promise<void> {
  const response = await fetch(`${API_BASE}/rooms/${roomId}/objects/${objectId}`, {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify({ color }),
  });
  if (!response.ok) {
    throw new ApiError("Failed to update object color", response.status);
  }
}

export function useUpdateObjectColor(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ objectId, color }: { objectId: string; color: string }) =>
      updateObjectColor(roomId, objectId, color),
    onError: (error: unknown) => {
      const status = error instanceof ApiError ? error.status : 0;
      const msg =
        status === 409
          ? "Someone else is editing this object — try again in a moment."
          : status === 429
            ? "Too many requests. Please wait a moment and try again."
            : "Could not update color. Please try again.";
      useErrorStore.getState().addError(msg);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: roomKeys.objects(roomId) });
    },
  });
}
