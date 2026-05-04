import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./api-base";
import { roomKeys } from "./query-keys";
import { ApiError } from "./api-error";
import { useErrorStore } from "@/app/error-store";

interface Position {
  x: number;
  y: number;
  z: number;
}

async function updateObjectPosition(
  roomId: string,
  objectId: string,
  position: Position
): Promise<void> {
  const response = await fetch(`${API_BASE}/rooms/${roomId}/objects/${objectId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ center: position }),
  });
  if (!response.ok) {
    throw new ApiError("Failed to update object position", response.status);
  }
}

export function useUpdateObjectPosition(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      objectId,
      position,
    }: {
      objectId: string;
      position: Position;
    }) => updateObjectPosition(roomId, objectId, position),
    onError: (error: unknown) => {
      const status = error instanceof ApiError ? error.status : 0;
      const msg =
        status === 429
          ? "Too many requests. Please wait a moment and try again."
          : "Could not move object. Please try again.";
      useErrorStore.getState().addError(msg);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: roomKeys.objects(roomId) });
    },
  });
}