import { useQuery } from "@tanstack/react-query";
import { roomKeys } from "./query-keys";
import { fromWireBox, fromWireCylinder, fromWireSphere, fromWireMesh } from "./wire-converters";
import type { PlacedBox, PlacedCylinder, PlacedSphere, PlacedMesh } from "../types";
import { getRoomsIdObjects } from "@/src/api/generated/endpoints/objects/objects";

interface RoomObjects {
  boxes: PlacedBox[];
  cylinders: PlacedCylinder[];
  spheres: PlacedSphere[];
  meshes: PlacedMesh[];
}

export function useRoomObjects(id: string) {
  return useQuery<RoomObjects>({
    queryKey: roomKeys.objects(id),
    queryFn: async () => {
      const result = await getRoomsIdObjects(id);
      const data = result.data;
      return {
        boxes: data.boxes.map(fromWireBox),
        cylinders: data.cylinders.map(fromWireCylinder),
        spheres: data.spheres.map(fromWireSphere),
        meshes: (data.meshes ?? []).map(fromWireMesh),
      };
    },
    enabled: !!id,
    // Cache is kept in sync via useRoomSocket; no polling needed.
    staleTime: Infinity,
  });
}
