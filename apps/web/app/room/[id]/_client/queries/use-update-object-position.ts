import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./api-base";
import { roomKeys } from "./query-keys";

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
    throw new Error("Failed to update object position");
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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: roomKeys.objects(roomId) });
    },
  });
}