"use client";

import React, { useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import { useParams } from "next/navigation";
import { Menu } from "@/app/components/menu";
import { Scene } from "./scene";
import { useBoxDraw } from "./use-box-draw";
import { useCylinderDraw } from "./use-cylinder-draw";
import { useSphereDraw } from "./use-sphere-draw";
import { DrawState, ToolType, PlacedBox, PlacedCylinder, PlacedSphere } from "./types";
import { useRoomObjects } from "./queries/use-room-objects";
import { usePlaceObject } from "./queries/use-place-object";
import { useUpdateObjectColor } from "./queries/use-update-object-color";
import { useUpdateObjectPosition } from "./queries/use-update-object-position";
import { toWireBox, toWireCylinder, toWireSphere } from "./queries/wire-converters";
import { getHelpText } from "@/app/utils";
import { useRoomStore } from "./room-store";
import { useErrorStore } from "@/app/error-store";
import { useRoomSocket } from "./realtime/use-room-socket";

const idleState: DrawState = { phase: "idle" };
const noop = () => { };

export const Room = () => {
  const params = useParams();
  const roomId = typeof params.id === "string" ? params.id : "default";

  const socket = useRoomSocket(roomId);

  const selectedTool = useRoomStore((s) => s.selectedTool);
  const selectionMode = useRoomStore((s) => s.selectionMode);
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const selectedColor = useRoomStore((s) => s.selectedColor);
  const setSelectedTool = useRoomStore((s) => s.setSelectedTool);
  const setSelectionMode = useRoomStore((s) => s.setSelectionMode);
  const setSelectedObjectId = useRoomStore((s) => s.setSelectedObjectId);
  const resetEditorState = useRoomStore((s) => s.resetEditorState);
  const setLivePosition = useRoomStore((s) => s.setLivePosition);

  const { data: serverObjects, isError: isObjectsError } = useRoomObjects(roomId);
  const placeObject = usePlaceObject(roomId);
  const updateObjectColor = useUpdateObjectColor(roomId);
  const updateObjectPosition = useUpdateObjectPosition(roomId);

  const handleBoxPlace = (box: PlacedBox) => {
    placeObject.mutate(
      { type: "box", data: toWireBox(box) },
      { onSettled: () => boxDraw.rollback(box.id) },
    );
  };

  const handleCylinderPlace = (cylinder: PlacedCylinder) => {
    placeObject.mutate(
      { type: "cylinder", data: toWireCylinder(cylinder) },
      { onSettled: () => cylinderDraw.rollback(cylinder.id) },
    );
  };

  const handleSpherePlace = (sphere: PlacedSphere) => {
    placeObject.mutate(
      { type: "sphere", data: toWireSphere(sphere) },
      { onSettled: () => sphereDraw.rollback(sphere.id) },
    );
  };

  const boxDraw = useBoxDraw({ onPlace: handleBoxPlace });
  const cylinderDraw = useCylinderDraw({ onPlace: handleCylinderPlace });
  const sphereDraw = useSphereDraw({ onPlace: handleSpherePlace });

  const handleToolSelect = (tool: ToolType) => {
    boxDraw.cancelDraw();
    cylinderDraw.cancelDraw();
    sphereDraw.cancelDraw();
    setSelectedTool(tool);
    setSelectionMode("draw");
    setSelectedObjectId(null);
  };

  const handleSelectClick = () => {
    setSelectionMode(selectionMode === "select" ? "draw" : "select");
    setSelectedObjectId(null);
    setSelectedTool(null);
    boxDraw.cancelDraw();
    cylinderDraw.cancelDraw();
    sphereDraw.cancelDraw();
  };

  const handleObjectMove = (objectId: string, newPosition: THREE.Vector3, persist: boolean) => {
    const pos = { x: newPosition.x, y: newPosition.y, z: newPosition.z };
    if (persist) {
      updateObjectPosition.mutate({ objectId, position: pos });
    }
    setLivePosition(objectId, pos);
  };

  const onMouseUpColorPicked = () => {
    if (selectedObjectId && selectedObject?.color !== selectedColor) {
      updateObjectColor.mutate({
        objectId: selectedObjectId,
        color: selectedColor,
      });
    }
  };

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      boxDraw.cancelDraw();
      cylinderDraw.cancelDraw();
      sphereDraw.cancelDraw();
      resetEditorState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxDraw.cancelDraw, cylinderDraw.cancelDraw, sphereDraw.cancelDraw, resetEditorState]);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  useEffect(() => {
    if (isObjectsError) {
      useErrorStore.getState().addError(
        "Could not load 3D objects. Try refreshing the page."
      );
    }
  }, [isObjectsError]);

  useEffect(() => {
    if (socket.connectionState === "full") {
      useErrorStore.getState().addError("This room is full (max 5 users).");
    }
  }, [socket.connectionState]);

  useEffect(() => {
    socket.emitSelection(selectedObjectId);
  }, [selectedObjectId, socket.emitSelection]);

  const activeDraw =
    selectedTool === "box"
      ? boxDraw
      : selectedTool === "cylinder"
        ? cylinderDraw
        : selectedTool === "sphere"
          ? sphereDraw
          : null;

  const handleGroundPointerMove = (point: THREE.Vector3) => {
    socket.emitCursor({ x: point.x, y: point.y, z: point.z });
    activeDraw?.handleGroundPointerMove(point);
  };

  const handleDragStart = useCallback(async (objectId: string) => {
    const result = await socket.requestLock(objectId);
    if (!result.ok) {
      useErrorStore.getState().addError(
        `Object is locked by another user — try again in a moment.`
      );
    }
    return result;
  }, [socket.requestLock]);

  const handleDragEnd = useCallback((objectId: string) => {
    socket.releaseLock(objectId);
  }, [socket.releaseLock]);

  const placedBoxes = useMemo(
    () => [...(serverObjects?.boxes ?? []), ...boxDraw.placedBoxes],
    [serverObjects, boxDraw.placedBoxes]
  );
  const placedCylinders = useMemo(
    () => [...(serverObjects?.cylinders ?? []), ...cylinderDraw.placedCylinders],
    [serverObjects, cylinderDraw.placedCylinders]
  );
  const placedSpheres = useMemo(
    () => [...(serverObjects?.spheres ?? []), ...sphereDraw.placedSpheres],
    [serverObjects, sphereDraw.placedSpheres]
  );

  const showSelectHelp = selectionMode === "select" && !selectedObjectId;
  const showObjectSelected = selectionMode === "select" && selectedObjectId;
  const selectedObject = selectedObjectId
    ? [...placedBoxes, ...placedCylinders, ...placedSpheres].find(
      (o) => o.id === selectedObjectId,
    )
    : undefined;

  const selectedObjectCoords = selectedObject
    ? `X: ${selectedObject.center.x.toFixed(2)}, Y: ${selectedObject.center.y.toFixed(2)}, Z: ${selectedObject.center.z.toFixed(2)}`
    : null;

  const handlePositionCommit = (x: number, y: number, z: number) => {
    if (selectedObjectId) {
      updateObjectPosition.mutate({
        objectId: selectedObjectId,
        position: { x, y, z },
      });
      setLivePosition(selectedObjectId, { x, y, z });
    }
  };

  return (
    <>
      {(selectedTool || showSelectHelp || showObjectSelected) && (
        <div className="p-4 absolute z-10 text-blue-200" id="help-text-container">
          <div className="chat chat-start mt-2">
            <div className="chat-bubble chat-bubble-primary text-xs py-2 px-4">
              {getHelpText({
                phase: activeDraw?.drawState.phase,
                showSelectHelp: !!showSelectHelp,
                showObjectSelected: !!showObjectSelected,
                selectedObjectCoords,
                selectedTool,
              })}
            </div>
          </div>
          {showObjectSelected && (
            <div className="chat chat-start mt-2">
              <div className="chat-bubble chat-bubble-accent text-xs py-2 px-4">
                Press <kbd className="kbd kbd-xs">Esc</kbd> to deselect
              </div>
            </div>
          )}
        </div>
      )}
      <div className="relative w-full h-full flex flex-col">
        {(updateObjectColor.isPending || placeObject.isPending) && (
          <div className="absolute top-4 right-4">
            <span className="loading loading-spinner loading-xs"></span>
          </div>
        )}
        <div className="flex-1" onPointerLeave={() => socket.emitCursor(null)}>
          <Scene
            drawState={activeDraw?.drawState ?? idleState}
            placedBoxes={placedBoxes}
            placedCylinders={placedCylinders}
            placedSpheres={placedSpheres}
            onGroundRightClick={activeDraw?.handleGroundRightClick ?? noop}
            onGroundPointerMove={handleGroundPointerMove}
            onGroundClick={activeDraw?.handleGroundClick ?? noop}
            onHeightPointerMove={activeDraw?.handleHeightPointerMove ?? noop}
            onHeightClick={activeDraw?.handleHeightClick ?? noop}
            onObjectMove={handleObjectMove}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
          <Menu
            currentColor={selectedObject?.color ?? "#2f74c0"}
            onToolSelect={handleToolSelect}
            onSelectClick={handleSelectClick}
            onMouseUpColorPicked={onMouseUpColorPicked}
            onPositionCommit={handlePositionCommit}
          />
        </div>
      </div>
    </>
  );
};
