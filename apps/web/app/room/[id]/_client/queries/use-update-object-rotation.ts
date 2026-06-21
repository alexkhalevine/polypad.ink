import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roomKeys } from "./query-keys";
import { ApiError } from "./api-error";
import { useErrorStore } from "@/app/error-store";
import { patchRoomsIdObjectsObjectId } from "@/src/api/generated/endpoints/objects/objects";

interface Rotation {
  x: number;
  y: number;
  z: number;
}

export function useUpdateObjectRotation(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ objectId, rotation }: { objectId: string; rotation: Rotation }) =>
      patchRoomsIdObjectsObjectId(roomId, objectId, { rotation }),
    onError: (error: unknown) => {
      const status = error instanceof ApiError ? error.status : 0;
      const msg =
        status === 409
          ? "Someone else is editing this object — try again in a moment."
          : status === 429
            ? "Too many requests. Please wait a moment and try again."
            : "Could not rotate object. Please try again.";
      useErrorStore.getState().addError(msg);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: roomKeys.objects(roomId) });
    },
  });
}
