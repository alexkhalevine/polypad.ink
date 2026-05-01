import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./api-base";
import { roomKeys } from "./query-keys";

async function updateObjectColor(roomId: string, objectId: string, color: string): Promise<void> {
  const response = await fetch(`${API_BASE}/rooms/${roomId}/objects/${objectId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ color }),
  });
  if (!response.ok) {
    throw new Error("Failed to update object color");
  }
}

export function useUpdateObjectColor(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ objectId, color }: { objectId: string; color: string }) =>
      updateObjectColor(roomId, objectId, color),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: roomKeys.objects(roomId) });
    },
  });
}
