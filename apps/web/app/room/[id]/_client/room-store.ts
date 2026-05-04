import { create } from "zustand";
import { ToolType, RemoteUserPresence } from "./types";

interface RoomStore {
  // Editor UI
  selectedTool: ToolType | null;
  selectedColor: string;
  snapEnabled: boolean;
  wireframeEnabled: boolean;
  selectionMode: "draw" | "select";
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  setSelectedTool: (tool: ToolType | null) => void;
  setSelectedColor: (color: string) => void;
  toggleSnap: () => void;
  toggleWireframe: () => void;
  setSelectionMode: (mode: "draw" | "select") => void;
  setSelectedObjectId: (id: string | null) => void;
  setHoveredObjectId: (id: string | null) => void;
  resetEditorState: () => void;

  // Live drag positions (overlay on server state during moves)
  livePositions: Record<string, { x: number; y: number; z: number }>;
  setLivePosition: (objectId: string, pos: { x: number; y: number; z: number }) => void;
  clearLivePosition: (objectId: string) => void;

  // Collaboration — stubs ready for WebSocket integration
  localUserId: string | null;
  remoteUsers: Record<string, RemoteUserPresence>;
  objectLocks: Record<string, string>;
  setLocalUser: (userId: string) => void;
  applyRemoteUserUpdate: (userId: string, presence: RemoteUserPresence) => void;
  removeRemoteUser: (userId: string) => void;
  applyRemoteLock: (objectId: string, userId: string) => void;
  releaseRemoteLock: (objectId: string) => void;
  applyRemoteMove: (objectId: string, pos: { x: number; y: number; z: number }) => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  selectedTool: null,
  selectedColor: "#000000",
  snapEnabled: false,
  wireframeEnabled: false,
  selectionMode: "draw",
  selectedObjectId: null,
  hoveredObjectId: null,
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedColor: (color) => set({ selectedColor: color }),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  toggleWireframe: () => set((s) => ({ wireframeEnabled: !s.wireframeEnabled })),
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  setHoveredObjectId: (id) => set({ hoveredObjectId: id }),
  resetEditorState: () =>
    set({ selectedTool: null, selectedObjectId: null, selectionMode: "draw" }),

  livePositions: {},
  setLivePosition: (objectId, pos) =>
    set((s) => ({ livePositions: { ...s.livePositions, [objectId]: pos } })),
  clearLivePosition: (objectId) =>
    set((s) => {
      const next = { ...s.livePositions };
      delete next[objectId];
      return { livePositions: next };
    }),

  localUserId: null,
  remoteUsers: {},
  objectLocks: {},
  setLocalUser: (userId) => set({ localUserId: userId }),
  applyRemoteUserUpdate: (userId, presence) =>
    set((s) => ({ remoteUsers: { ...s.remoteUsers, [userId]: presence } })),
  removeRemoteUser: (userId) =>
    set((s) => {
      const next = { ...s.remoteUsers };
      delete next[userId];
      return { remoteUsers: next };
    }),
  applyRemoteLock: (objectId, userId) =>
    set((s) => ({ objectLocks: { ...s.objectLocks, [objectId]: userId } })),
  releaseRemoteLock: (objectId) =>
    set((s) => {
      const next = { ...s.objectLocks };
      delete next[objectId];
      return { objectLocks: next };
    }),
  applyRemoteMove: (objectId, pos) =>
    set((s) => ({ livePositions: { ...s.livePositions, [objectId]: pos } })),
}));
