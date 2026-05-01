"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Menu } from "@/app/components/menu";
import { Scene } from "./scene";
import { useBoxDraw } from "./use-box-draw";
import { useCylinderDraw } from "./use-cylinder-draw";
import { useSphereDraw } from "./use-sphere-draw";
import {
  DrawState,
  ToolType,
  PlacedBox,
  PlacedCylinder,
  PlacedSphere,
} from "./types";
import { useRoomObjects } from "./queries/use-room-objects";
import { usePlaceObject } from "./queries/use-place-object";
import { useUpdateObjectColor } from "./queries/use-update-object-color";
import {
  toWireBox,
  toWireCylinder,
  toWireSphere,
} from "./queries/wire-converters";

const idleState: DrawState = { phase: "idle" };
const noop = () => {};

export const Room = () => {
  const params = useParams();
  const roomId = typeof params.id === "string" ? params.id : "default";

  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#000000");
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [wireframeEnabled, setWireframeEnabled] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"draw" | "select">("draw");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);

  const { data: serverObjects } = useRoomObjects(roomId);
  const placeObject = usePlaceObject(roomId);
  const updateObjectColor = useUpdateObjectColor(roomId);

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
    setSelectionMode((m) => (m === "select" ? "draw" : "select"));
    setSelectedObjectId(null);
    setSelectedTool(null);
    boxDraw.cancelDraw();
    cylinderDraw.cancelDraw();
    sphereDraw.cancelDraw();
  };

  const handleObjectClick = (objectId: string) => {
    if (selectionMode === "select") {
      setSelectedObjectId(objectId);
    }
  };

  const handleObjectHover = (objectId: string | null) => {
    setHoveredObjectId(objectId);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
  };

  const onMouseUpColorPicked = () => {
    if (selectedObjectId) {
      updateObjectColor.mutate({
        objectId: selectedObjectId,
        color: selectedColor,
      });
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        boxDraw.cancelDraw();
        cylinderDraw.cancelDraw();
        sphereDraw.cancelDraw();
        setSelectedTool(null);
        setSelectedObjectId(null);
        setSelectionMode("draw");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [boxDraw.cancelDraw, cylinderDraw.cancelDraw, sphereDraw.cancelDraw]);

  const activeDraw =
    selectedTool === "box"
      ? boxDraw
      : selectedTool === "cylinder"
        ? cylinderDraw
        : selectedTool === "sphere"
          ? sphereDraw
          : null;

  const serverBoxes = serverObjects?.boxes ?? [];
  const serverCylinders = serverObjects?.cylinders ?? [];
  const serverSpheres = serverObjects?.spheres ?? [];

  const showSelectHelp = selectionMode === "select" && !selectedObjectId;
  const showObjectSelected = selectionMode === "select" && selectedObjectId;
  const selectedObject = [
    ...serverBoxes,
    ...serverCylinders,
    ...serverSpheres,
  ].find((o) => o.id === selectedObjectId);

  const selectedObjectCoords = selectedObject
    ? `X: ${selectedObject.center.x.toFixed(2)}, Y: ${selectedObject.center.y.toFixed(2)}, Z: ${selectedObject.center.z.toFixed(2)}`
    : null;

  return (
    <div className="relative w-full h-full flex flex-col">
      {(selectedTool || showSelectHelp || showObjectSelected) && (
        <div className="p-4" id="help-text-container">
          <div className="status status-info animate-bounce"></div>{" "}
          <span id="help-text">
            {activeDraw?.drawState.phase === "height"
              ? "drag mouse to define the height of the primitive, left click to confirm"
              : activeDraw?.drawState.phase === "footprint"
                ? "drag the mouse to define the geometry base, left click to confirm"
                : showSelectHelp
                  ? "select object you like to edit"
                  : showObjectSelected
                    ? `object selected ${selectedObjectCoords}`
                    : "click right mouse button somewhere on the ground plate to start drawing, left click to place the primitive"}
          </span>
        </div>
      )}
      {(updateObjectColor.isPending || placeObject.isPending) && (
        <div className="absolute top-4 right-4">
          <span className="loading loading-spinner loading-xs"></span>
        </div>
      )}
      <div className="flex-1">
        <Scene
          selectedTool={selectedTool}
          snapEnabled={snapEnabled}
          wireframeEnabled={wireframeEnabled}
          drawState={activeDraw?.drawState ?? idleState}
          placedBoxes={[...serverBoxes, ...boxDraw.placedBoxes]}
          placedCylinders={[
            ...serverCylinders,
            ...cylinderDraw.placedCylinders,
          ]}
          placedSpheres={[...serverSpheres, ...sphereDraw.placedSpheres]}
          selectedObjectId={selectedObjectId}
          hoveredObjectId={hoveredObjectId}
          selectionMode={selectionMode}
          onGroundRightClick={activeDraw?.handleGroundRightClick ?? noop}
          onGroundPointerMove={activeDraw?.handleGroundPointerMove ?? noop}
          onGroundClick={activeDraw?.handleGroundClick ?? noop}
          onHeightPointerMove={activeDraw?.handleHeightPointerMove ?? noop}
          onHeightClick={activeDraw?.handleHeightClick ?? noop}
          onObjectClick={handleObjectClick}
          onObjectHover={handleObjectHover}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex justify-center">
        <Menu
          selectedTool={selectedTool}
          onToolSelect={handleToolSelect}
          snapEnabled={snapEnabled}
          onSnapToggle={() => setSnapEnabled((v) => !v)}
          wireframeEnabled={wireframeEnabled}
          onWireframeToggle={() => setWireframeEnabled((v) => !v)}
          selectionMode={selectionMode}
          onSelectClick={handleSelectClick}
          colorPickerEnabled={!!selectedObjectId}
          currentColor={selectedObject?.color ?? "#2f74c0"}
          onColorChange={handleColorChange}
          onMouseUpColorPicked={onMouseUpColorPicked}
        />
      </div>
    </div>
  );
};
