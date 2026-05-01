export const roomKeys = {
  detail: (id: string) => ["rooms", id] as const,
  objects: (id: string) => ["rooms", id, "objects"] as const,
};