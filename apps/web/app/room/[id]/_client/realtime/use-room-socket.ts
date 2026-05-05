'use client';
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { useQueryClient } from "@tanstack/react-query";
import { useRoomStore } from "../room-store";
import { roomKeys } from "../queries/query-keys";
import { fromWireBox, fromWireCylinder, fromWireSphere } from "../queries/wire-converters";
import type { PlacedBox, PlacedCylinder, PlacedSphere } from "../types";
import {
  createRoomSocket,
  getOrCreateUserId,
  getDisplayName,
  type RoomSocket,
} from "./socket";
import type {
  RoomStatePayload,
  ObjectCreatedPayload,
  ObjectUpdatedPayload,
  ObjectDeletedPayload,
  ObjectLockedPayload,
  ObjectUnlockedPayload,
  PresenceJoinedPayload,
  PresenceLeftPayload,
  PresenceCursorPayload,
  PresenceSelectionPayload,
  Vec3,
} from "./event-types";

interface RoomObjects {
  boxes: PlacedBox[];
  cylinders: PlacedCylinder[];
  spheres: PlacedSphere[];
}

type ConnectionState = "connecting" | "connected" | "disconnected" | "full";

export interface UseRoomSocketResult {
  connectionState: ConnectionState;
  emitCursor: (cursor: Vec3 | null) => void;
  emitSelection: (objectId: string | null) => void;
  requestLock: (objectId: string) => Promise<{ ok: boolean; lockedBy?: string }>;
  releaseLock: (objectId: string) => Promise<void>;
}

export function useRoomSocket(roomId: string): UseRoomSocketResult {
  const queryClient = useQueryClient();
  const socketRef = useRef<RoomSocket | null>(null);
  const lastCursorEmitRef = useRef<number>(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");

  useEffect(() => {
    const userId = getOrCreateUserId();
    const displayName = getDisplayName();

    useRoomStore.getState().setLocalUser(userId);

    const socket = createRoomSocket(roomId, userId, displayName);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
      const store = useRoomStore.getState();
      Object.keys(store.remoteUsers).forEach((uid) => store.removeRemoteUser(uid));
      Object.keys(store.objectLocks).forEach((objectId) => store.releaseRemoteLock(objectId));
    });

    socket.on("connect_error", () => {
      setConnectionState("disconnected");
    });

    socket.on("room:full", () => {
      setConnectionState("full");
      socket.disconnect();
    });

    socket.on("room:state", (payload: RoomStatePayload) => {
      const store = useRoomStore.getState();
      for (const user of payload.users) {
        if (user.userId !== userId) {
          store.applyRemoteUserUpdate(user.userId, {
            displayName: user.displayName,
            cursor: user.cursor,
            selectedObjectId: user.selectedObjectId,
          });
        }
      }
      for (const [objectId, lockedBy] of Object.entries(payload.locks)) {
        if (lockedBy !== userId) {
          store.applyRemoteLock(objectId, lockedBy);
        }
      }
      queryClient.setQueryData<RoomObjects>(roomKeys.objects(roomId), {
        boxes: payload.objects.boxes.map(fromWireBox),
        cylinders: payload.objects.cylinders.map(fromWireCylinder),
        spheres: payload.objects.spheres.map(fromWireSphere),
      });
    });

    socket.on("presence:joined", (payload: PresenceJoinedPayload) => {
      useRoomStore.getState().applyRemoteUserUpdate(payload.userId, {
        displayName: payload.displayName,
        cursor: null,
        selectedObjectId: null,
      });
    });

    socket.on("presence:left", (payload: PresenceLeftPayload) => {
      useRoomStore.getState().removeRemoteUser(payload.userId);
    });

    socket.on("presence:cursor", (payload: PresenceCursorPayload) => {
      const store = useRoomStore.getState();
      const existing = store.remoteUsers[payload.userId];
      store.applyRemoteUserUpdate(payload.userId, {
        displayName: existing?.displayName ?? payload.userId,
        cursor: payload.cursor,
        selectedObjectId: existing?.selectedObjectId ?? null,
      });
    });

    socket.on("presence:selection", (payload: PresenceSelectionPayload) => {
      const store = useRoomStore.getState();
      const existing = store.remoteUsers[payload.userId];
      store.applyRemoteUserUpdate(payload.userId, {
        displayName: existing?.displayName ?? payload.userId,
        cursor: existing?.cursor ?? null,
        selectedObjectId: payload.objectId,
      });
    });

    socket.on("object:created", (payload: ObjectCreatedPayload) => {
      queryClient.setQueryData<RoomObjects>(roomKeys.objects(roomId), (prev) => {
        if (!prev) return prev;
        const obj = payload.object;
        if (obj.type === "box") {
          if (prev.boxes.some((b) => b.id === obj.data.id)) return prev;
          return { ...prev, boxes: [...prev.boxes, fromWireBox(obj.data)] };
        }
        if (obj.type === "cylinder") {
          if (prev.cylinders.some((c) => c.id === obj.data.id)) return prev;
          return { ...prev, cylinders: [...prev.cylinders, fromWireCylinder(obj.data)] };
        }
        if (obj.type === "sphere") {
          if (prev.spheres.some((s) => s.id === obj.data.id)) return prev;
          return { ...prev, spheres: [...prev.spheres, fromWireSphere(obj.data)] };
        }
        return prev;
      });
    });

    socket.on("object:updated", (payload: ObjectUpdatedPayload) => {
      queryClient.setQueryData<RoomObjects>(roomKeys.objects(roomId), (prev) => {
        if (!prev) return prev;
        const patchCenter = payload.patch.center
          ? new THREE.Vector3(payload.patch.center.x, payload.patch.center.y, payload.patch.center.z)
          : undefined;
        return {
          boxes: prev.boxes.map((b) => {
            if (b.id !== payload.objectId) return b;
            return {
              ...b,
              ...(payload.patch.color !== undefined ? { color: payload.patch.color } : {}),
              ...(patchCenter !== undefined ? { center: patchCenter } : {}),
            };
          }),
          cylinders: prev.cylinders.map((c) => {
            if (c.id !== payload.objectId) return c;
            return {
              ...c,
              ...(payload.patch.color !== undefined ? { color: payload.patch.color } : {}),
              ...(patchCenter !== undefined ? { center: patchCenter } : {}),
            };
          }),
          spheres: prev.spheres.map((s) => {
            if (s.id !== payload.objectId) return s;
            return {
              ...s,
              ...(payload.patch.color !== undefined ? { color: payload.patch.color } : {}),
              ...(patchCenter !== undefined ? { center: patchCenter } : {}),
            };
          }),
        };
      });

      if (payload.by !== userId && payload.patch.center) {
        useRoomStore.getState().applyRemoteMove(payload.objectId, payload.patch.center);
      }
    });

    socket.on("object:deleted", (payload: ObjectDeletedPayload) => {
      queryClient.setQueryData<RoomObjects>(roomKeys.objects(roomId), (prev) => {
        if (!prev) return prev;
        return {
          boxes: prev.boxes.filter((b) => b.id !== payload.objectId),
          cylinders: prev.cylinders.filter((c) => c.id !== payload.objectId),
          spheres: prev.spheres.filter((s) => s.id !== payload.objectId),
        };
      });
      useRoomStore.getState().releaseRemoteLock(payload.objectId);
    });

    socket.on("object:locked", (payload: ObjectLockedPayload) => {
      if (payload.userId !== userId) {
        useRoomStore.getState().applyRemoteLock(payload.objectId, payload.userId);
      }
    });

    socket.on("object:unlocked", (payload: ObjectUnlockedPayload) => {
      useRoomStore.getState().releaseRemoteLock(payload.objectId);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, queryClient]);

  const emitCursor = useCallback((cursor: Vec3 | null) => {
    const socket = socketRef.current;
    if (!socket) return;
    if (cursor === null) {
      socket.volatile.emit("presence:cursor", { cursor: null });
      return;
    }
    const now = Date.now();
    if (now - lastCursorEmitRef.current < 50) return;
    lastCursorEmitRef.current = now;
    socket.volatile.emit("presence:cursor", { cursor });
  }, []);

  const emitSelection = useCallback((objectId: string | null) => {
    socketRef.current?.emit("presence:selection", { objectId });
  }, []);

  const requestLock = useCallback((objectId: string): Promise<{ ok: boolean; lockedBy?: string }> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) {
        resolve({ ok: false });
        return;
      }
      socket.emit("object:lock", { objectId }, (response) => resolve(response));
    });
  }, []);

  const releaseLock = useCallback((objectId: string): Promise<void> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) {
        resolve();
        return;
      }
      socket.emit("object:unlock", { objectId }, () => resolve());
    });
  }, []);

  return { connectionState, emitCursor, emitSelection, requestLock, releaseLock };
}
