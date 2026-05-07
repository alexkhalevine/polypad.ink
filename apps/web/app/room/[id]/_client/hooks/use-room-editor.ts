import { useEffect, useMemo, useCallback, useRef } from "react";
import * as THREE from "three";
import { useBoxDraw } from "./use-box-draw";
import { useCylinderDraw } from "./use-cylinder-draw";
import { useSphereDraw } from "./use-sphere-draw";
import { ToolType, PlacedBox, PlacedCylinder, PlacedSphere } from "../types";
import { useRoomObjects } from "../queries/use-room-objects";
import { usePlaceObject } from "../queries/use-place-object";
import { useUpdateObjectColor } from "../queries/use-update-object-color";
import { useUpdateObjectPosition } from "../queries/use-update-object-position";
import { toWireBox, toWireCylinder, toWireSphere } from "../queries/wire-converters";
import { useRoomStore } from "../room-store";
import { useErrorStore } from "@/app/error-store";
import { useRoomSocket } from "../realtime/use-room-socket";

type Socket = ReturnType<typeof useRoomSocket>;

export const useRoomEditor = (roomId: string, socket: Socket) => {
  const { emitCursor, emitSelection, requestLock, releaseLock, connectionState } = socket;

  const selectedTool = useRoomStore((s) => s.selectedTool);
  const selectionMode = useRoomStore((s) => s.selectionMode);
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const selectedColor = useRoomStore((s) => s.selectedColor);
  const setSelectedTool = useRoomStore((s) => s.setSelectedTool);
  const setSelectionMode = useRoomStore((s) => s.setSelectionMode);
  const setSelectedObjectId = useRoomStore((s) => s.setSelectedObjectId);
  const resetEditorState = useRoomStore((s) => s.resetEditorState);
  const setLivePosition = useRoomStore((s) => s.setLivePosition);
  const addError = useErrorStore((s) => s.addError);

  const { data: serverObjects, isError: isObjectsError } = useRoomObjects(roomId);
  const placeObject = usePlaceObject(roomId);
  const updateObjectColor = useUpdateObjectColor(roomId);
  const updateObjectPosition = useUpdateObjectPosition(roomId);

  // Refs break the onPlace → draw hook → rollback cycle so onPlace can be stable.
  const boxDrawRef = useRef<ReturnType<typeof useBoxDraw> | null>(null);
  const cylinderDrawRef = useRef<ReturnType<typeof useCylinderDraw> | null>(null);
  const sphereDrawRef = useRef<ReturnType<typeof useSphereDraw> | null>(null);

  const handleBoxPlace = useCallback((box: PlacedBox) => {
    placeObject.mutate(
      { type: "box", data: toWireBox(box) },
      { onSettled: () => boxDrawRef.current?.rollback(box.id) },
    );
  }, [placeObject]);

  const handleCylinderPlace = useCallback((cylinder: PlacedCylinder) => {
    placeObject.mutate(
      { type: "cylinder", data: toWireCylinder(cylinder) },
      { onSettled: () => cylinderDrawRef.current?.rollback(cylinder.id) },
    );
  }, [placeObject]);

  const handleSpherePlace = useCallback((sphere: PlacedSphere) => {
    placeObject.mutate(
      { type: "sphere", data: toWireSphere(sphere) },
      { onSettled: () => sphereDrawRef.current?.rollback(sphere.id) },
    );
  }, [placeObject]);

  const boxDraw = useBoxDraw({ onPlace: handleBoxPlace });
  const cylinderDraw = useCylinderDraw({ onPlace: handleCylinderPlace });
  const sphereDraw = useSphereDraw({ onPlace: handleSpherePlace });

  boxDrawRef.current = boxDraw;
  cylinderDrawRef.current = cylinderDraw;
  sphereDrawRef.current = sphereDraw;

  const { cancelDraw: cancelBoxDraw } = boxDraw;
  const { cancelDraw: cancelCylinderDraw } = cylinderDraw;
  const { cancelDraw: cancelSphereDraw } = sphereDraw;

  const cancelAll = useCallback(() => {
    cancelBoxDraw();
    cancelCylinderDraw();
    cancelSphereDraw();
  }, [cancelBoxDraw, cancelCylinderDraw, cancelSphereDraw]);

  const activeDraw = useMemo(() => {
    const map = { box: boxDraw, cylinder: cylinderDraw, sphere: sphereDraw } as const;
    return selectedTool && selectedTool in map
      ? map[selectedTool as keyof typeof map]
      : null;
  }, [selectedTool, boxDraw, cylinderDraw, sphereDraw]);

  const placedBoxes = useMemo(
    () => [...(serverObjects?.boxes ?? []), ...boxDraw.placedBoxes],
    [serverObjects, boxDraw.placedBoxes],
  );
  const placedCylinders = useMemo(
    () => [...(serverObjects?.cylinders ?? []), ...cylinderDraw.placedCylinders],
    [serverObjects, cylinderDraw.placedCylinders],
  );
  const placedSpheres = useMemo(
    () => [...(serverObjects?.spheres ?? []), ...sphereDraw.placedSpheres],
    [serverObjects, sphereDraw.placedSpheres],
  );

  const selectedObject = useMemo(
    () =>
      selectedObjectId
        ? [...placedBoxes, ...placedCylinders, ...placedSpheres].find(
            (o) => o.id === selectedObjectId,
          )
        : undefined,
    [selectedObjectId, placedBoxes, placedCylinders, placedSpheres],
  );

  const selectedObjectCoords = selectedObject
    ? `X: ${selectedObject.center.x.toFixed(2)}, Y: ${selectedObject.center.y.toFixed(2)}, Z: ${selectedObject.center.z.toFixed(2)}`
    : null;

  const showSelectHelp = selectionMode === "select" && !selectedObjectId;
  const showObjectSelected = selectionMode === "select" && !!selectedObjectId;

  const handleToolSelect = useCallback(
    (tool: ToolType) => {
      cancelAll();
      setSelectedTool(tool);
      setSelectionMode("draw");
      setSelectedObjectId(null);
    },
    [cancelAll, setSelectedTool, setSelectionMode, setSelectedObjectId],
  );

  const handleSelectClick = useCallback(() => {
    setSelectionMode(selectionMode === "select" ? "draw" : "select");
    setSelectedObjectId(null);
    setSelectedTool(null);
    cancelAll();
  }, [selectionMode, setSelectionMode, setSelectedObjectId, setSelectedTool, cancelAll]);

  const handleObjectMove = useCallback(
    (objectId: string, newPosition: THREE.Vector3, persist: boolean) => {
      const pos = { x: newPosition.x, y: newPosition.y, z: newPosition.z };
      if (persist) {
        updateObjectPosition.mutate({ objectId, position: pos });
      }
      setLivePosition(objectId, pos);
    },
    [updateObjectPosition, setLivePosition],
  );

  const onMouseUpColorPicked = useCallback(() => {
    if (selectedObjectId && selectedObject?.color !== selectedColor) {
      updateObjectColor.mutate({ objectId: selectedObjectId, color: selectedColor });
    }
  }, [selectedObjectId, selectedObject, selectedColor, updateObjectColor]);

  const handleGroundPointerMove = useCallback(
    (point: THREE.Vector3) => {
      emitCursor({ x: point.x, y: point.y, z: point.z });
      activeDraw?.handleGroundPointerMove(point);
    },
    [emitCursor, activeDraw],
  );

  const handleDragStart = useCallback(
    async (objectId: string) => {
      const result = await requestLock(objectId);
      if (!result.ok) {
        addError("Object is locked by another user — try again in a moment.");
      }
      return result;
    },
    [requestLock, addError],
  );

  const handleDragEnd = useCallback(
    (objectId: string) => {
      releaseLock(objectId);
    },
    [releaseLock],
  );

  const handlePositionCommit = useCallback(
    (x: number, y: number, z: number) => {
      if (selectedObjectId) {
        updateObjectPosition.mutate({ objectId: selectedObjectId, position: { x, y, z } });
        setLivePosition(selectedObjectId, { x, y, z });
      }
    },
    [selectedObjectId, updateObjectPosition, setLivePosition],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelAll();
        resetEditorState();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelAll, resetEditorState]);

  useEffect(() => {
    if (isObjectsError) {
      addError("Could not load 3D objects. Try refreshing the page.");
    }
  }, [isObjectsError, addError]);

  useEffect(() => {
    if (connectionState === "full") {
      addError("This room is full (max 5 users).");
    }
  }, [connectionState, addError]);

  useEffect(() => {
    emitSelection(selectedObjectId);
  }, [selectedObjectId, emitSelection]);

  return {
    activeDraw,
    placedBoxes,
    placedCylinders,
    placedSpheres,
    selectedObject,
    selectedTool,
    showSelectHelp,
    showObjectSelected,
    selectedObjectCoords,
    isPending: updateObjectColor.isPending || placeObject.isPending,
    handleToolSelect,
    handleSelectClick,
    handleObjectMove,
    onMouseUpColorPicked,
    handleGroundPointerMove,
    handleDragStart,
    handleDragEnd,
    handlePositionCommit,
  };
};
