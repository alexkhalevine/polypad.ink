import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roomKeys } from "./query-keys";
import { ApiError } from "./api-error";
import { useErrorStore } from "@/app/error-store";
import { patchRoomsIdObjectsObjectId } from "@/src/api/generated/endpoints/objects/objects";

export type DimensionPatch = Partial<{
  width: number;
  height: number;
  depth: number;
  radius: number;
}>;

export function useUpdateObjectDimensions(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      objectId,
      dimensions,
    }: {
      objectId: string;
      dimensions: DimensionPatch;
    }) => patchRoomsIdObjectsObjectId(roomId, objectId, dimensions),
    onError: (error: unknown) => {
      const status = error instanceof ApiError ? error.status : 0;
      const msg =
        status === 409
          ? "Someone else is editing this object — try again in a moment."
          : status === 429
            ? "Too many requests. Please wait a moment and try again."
            : "Could not resize object. Please try again.";
      useErrorStore.getState().addError(msg);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: roomKeys.objects(roomId) });
    },
  });
}
