import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "./api-base";
import { roomKeys } from "./query-keys";

interface Room {
  id: string;
  name: string;
  createdAt: string;
}

async function fetchRoom(id: string): Promise<Room> {
  const response = await fetch(`${API_BASE}/rooms/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch room");
  }
  return response.json();
}

export function useRoom(id: string) {
  return useQuery({
    queryKey: roomKeys.detail(id),
    queryFn: () => fetchRoom(id),
    enabled: !!id,
  });
}