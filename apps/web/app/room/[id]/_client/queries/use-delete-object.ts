import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roomKeys } from "./query-keys";
import { ApiError } from "./api-error";
import { useErrorStore } from "@/app/error-store";
import { deleteRoomsIdObjectsObjectId } from "@/src/api/generated/endpoints/objects/objects";

export function useDeleteObject(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (objectId: string) => deleteRoomsIdObjectsObjectId(roomId, objectId),
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
