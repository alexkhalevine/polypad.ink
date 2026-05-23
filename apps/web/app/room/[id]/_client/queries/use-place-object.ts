import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roomKeys } from "./query-keys";
import type { WireObject } from "./wire-types";
import { ApiError } from "./api-error";
import { useErrorStore } from "@/app/error-store";
import { postRoomsIdObjects } from "@/src/api/generated/endpoints/objects/objects";

export function usePlaceObject(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (object: WireObject) => postRoomsIdObjects(roomId, object),
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
