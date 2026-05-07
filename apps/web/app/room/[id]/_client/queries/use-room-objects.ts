import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "./api-base";
import { roomKeys } from "./query-keys";
import { fromWireBox, fromWireCylinder, fromWireSphere } from "./wire-converters";
import type { PlacedBox, PlacedCylinder, PlacedSphere } from "../types";
import { ApiError } from "./api-error";

interface RoomObjects {
  boxes: PlacedBox[];
  cylinders: PlacedCylinder[];
  spheres: PlacedSphere[];
}

async function fetchRoomObjects(id: string): Promise<RoomObjects> {
  const response = await fetch(`${API_BASE}/rooms/${id}/objects`);
  if (!response.ok) {
    throw new ApiError("Failed to fetch room objects", response.status);
  }
  const data = await response.json();
  return {
    boxes: data.boxes.map(fromWireBox),
    cylinders: data.cylinders.map(fromWireCylinder),
    spheres: data.spheres.map(fromWireSphere),
  };
}

export function useRoomObjects(id: string) {
  return useQuery({
    queryKey: roomKeys.objects(id),
    queryFn: () => fetchRoomObjects(id),
    enabled: !!id,
    // Cache is kept in sync via useRoomSocket; no polling needed.
    staleTime: Infinity,
  });
}