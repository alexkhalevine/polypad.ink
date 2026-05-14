import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./api-base";
import { roomKeys } from "./query-keys";
import { ApiError } from "./api-error";
import { jsonHeaders } from "./api-headers";
import { useErrorStore } from "@/app/error-store";

async function deleteObject(roomId: string, objectId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/rooms/${roomId}/objects/${objectId}`, {
    method: "DELETE",
    headers: jsonHeaders(),
  });
  if (!response.ok) throw new ApiError("Failed to delete object", response.status);
}

export function useDeleteObject(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (objectId: string) => deleteObject(roomId, objectId),
    onError: (error: unknown) => {
      const status = error instanceof ApiError ? error.status : 0;
      const msg =
        status === 429
          ? "Too many requests. Please wait a moment."
          : "Could not delete object. Please try again.";
      useErrorStore.getState().addError(msg);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: roomKeys.objects(roomId) }),
  });
}
