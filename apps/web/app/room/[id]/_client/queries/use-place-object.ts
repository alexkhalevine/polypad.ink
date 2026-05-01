import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./api-base";
import { roomKeys } from "./query-keys";
import type { WireObject } from "./wire-types";

async function placeObject(roomId: string, object: WireObject): Promise<void> {
  const response = await fetch(`${API_BASE}/rooms/${roomId}/objects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(object),
  });
  if (!response.ok) {
    throw new Error("Failed to place object");
  }
}

export function usePlaceObject(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (object: WireObject) => placeObject(roomId, object),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: roomKeys.objects(roomId) });
    },
  });
}
