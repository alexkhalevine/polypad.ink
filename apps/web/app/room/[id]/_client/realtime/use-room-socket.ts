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
  requestSelection: (objectId: string | null) => Promise<{ ok: boolean; selectedBy?: string }>;
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

    const debugRt =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "rt";
    const tStart = performance.now();
    let connectedAt: number | null = null;
    let firstPeerLogged = false;
    let firstStateLogged = false;

    const socket = createRoomSocket(roomId, userId, displayName);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
      connectedAt = performance.now();
      if (debugRt) {
        console.log(
          `[rt-client] connect transport=${socket.io.engine?.transport?.name ?? "?"} since-mount=${(connectedAt - tStart).toFixed(1)}ms`,
        );
      }
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
      if (debugRt && !firstStateLogged && connectedAt !== null) {
        firstStateLogged = true;
        console.log(
          `[rt-client] room:state connect→state=${(performance.now() - connectedAt).toFixed(1)}ms users=${payload.users.length}`,
        );
      }
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
      if (debugRt && !firstPeerLogged && connectedAt !== null) {
        firstPeerLogged = true;
        console.log(
          `[rt-client] first peer connect→first-peer=${(performance.now() - connectedAt).toFixed(1)}ms userId=${payload.userId}`,
        );
      }
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
        // Wire patch still keys position as `center` for backwards compat; locally we store it as `position`.
        const { color, center, width, height, depth, radius } = payload.patch;
        const patchPosition = center
          ? new THREE.Vector3(center.x, center.y, center.z)
          : undefined;
        return {
          boxes: prev.boxes.map((b) => {
            if (b.id !== payload.objectId) return b;
            return {
              ...b,
              ...(color !== undefined ? { color } : {}),
              ...(patchPosition !== undefined ? { position: patchPosition } : {}),
              ...(width !== undefined ? { width } : {}),
              ...(height !== undefined ? { height } : {}),
              ...(depth !== undefined ? { depth } : {}),
            };
          }),
          cylinders: prev.cylinders.map((c) => {
            if (c.id !== payload.objectId) return c;
            return {
              ...c,
              ...(color !== undefined ? { color } : {}),
              ...(patchPosition !== undefined ? { position: patchPosition } : {}),
              ...(radius !== undefined ? { radius } : {}),
              ...(height !== undefined ? { height } : {}),
            };
          }),
          spheres: prev.spheres.map((s) => {
            if (s.id !== payload.objectId) return s;
            return {
              ...s,
              ...(color !== undefined ? { color } : {}),
              ...(patchPosition !== undefined ? { position: patchPosition } : {}),
              ...(radius !== undefined ? { radius } : {}),
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

  const requestSelection = useCallback(
    (objectId: string | null): Promise<{ ok: boolean; selectedBy?: string }> => {
      return new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket) {
          resolve({ ok: false });
          return;
        }
        socket.emit("presence:selection", { objectId }, (response) => resolve(response));
      });
    },
    [],
  );

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

  return { connectionState, emitCursor, requestSelection, requestLock, releaseLock };
}
