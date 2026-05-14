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

  // Live dimension edits (overlay on server state while typing in resize inputs)
  liveDimensions: Record<string, Partial<{ width: number; height: number; depth: number; radius: number }>>;
  setLiveDimension: (
    objectId: string,
    field: "width" | "height" | "depth" | "radius",
    value: number,
  ) => void;
  clearLiveDimensions: (objectId: string) => void;

  // Align tool state
  alignTargetId: string | null;
  setAlignTargetId: (id: string | null) => void;
  alignDragging: boolean;
  setAlignDragging: (v: boolean) => void;
  alignAxes: { x: boolean; y: boolean; z: boolean };
  alignSourceSide: "min" | "max";
  alignTargetSide: "min" | "max";
  setAlignAxes: (axes: { x: boolean; y: boolean; z: boolean }) => void;
  setAlignSourceSide: (side: "min" | "max") => void;
  setAlignTargetSide: (side: "min" | "max") => void;

  // STL export trigger — set true to request export from inside the Canvas
  exportRequested: boolean;
  setExportRequested: (v: boolean) => void;

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
    set({
      selectedTool: null,
      selectedObjectId: null,
      selectionMode: "draw",
      alignTargetId: null,
      alignDragging: false,
      alignAxes: { x: false, y: false, z: false },
      alignSourceSide: "min",
      alignTargetSide: "min",
    }),

  livePositions: {},
  setLivePosition: (objectId, pos) =>
    set((s) => ({ livePositions: { ...s.livePositions, [objectId]: pos } })),
  clearLivePosition: (objectId) =>
    set((s) => {
      const next = { ...s.livePositions };
      delete next[objectId];
      return { livePositions: next };
    }),

  liveDimensions: {},
  setLiveDimension: (objectId, field, value) =>
    set((s) => ({
      liveDimensions: {
        ...s.liveDimensions,
        [objectId]: { ...(s.liveDimensions[objectId] ?? {}), [field]: value },
      },
    })),
  clearLiveDimensions: (objectId) =>
    set((s) => {
      const next = { ...s.liveDimensions };
      delete next[objectId];
      return { liveDimensions: next };
    }),

  alignTargetId: null,
  setAlignTargetId: (id) => set({ alignTargetId: id }),
  alignDragging: false,
  setAlignDragging: (v) => set({ alignDragging: v }),
  alignAxes: { x: false, y: false, z: false },
  alignSourceSide: "min",
  alignTargetSide: "min",
  setAlignAxes: (axes) => set({ alignAxes: axes }),
  setAlignSourceSide: (side) => set({ alignSourceSide: side }),
  setAlignTargetSide: (side) => set({ alignTargetSide: side }),

  exportRequested: false,
  setExportRequested: (v) => set({ exportRequested: v }),

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
