"use client";

import React, { useState, useEffect } from "react";
import { Menu } from "@/app/components/menu";
import { Scene } from "./scene";
import { useBoxDraw } from "./use-box-draw";
import { useCylinderDraw } from "./use-cylinder-draw";
import { useSphereDraw } from "./use-sphere-draw";
import { DrawState, ToolType } from "./types";

const idleState: DrawState = { phase: "idle" };
const noop = () => {};

export const Room = () => {
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(false);

  const boxDraw = useBoxDraw();
  const cylinderDraw = useCylinderDraw();
  const sphereDraw = useSphereDraw();

  const handleToolSelect = (tool: ToolType) => {
    boxDraw.cancelDraw();
    cylinderDraw.cancelDraw();
    sphereDraw.cancelDraw();
    setSelectedTool(tool);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        boxDraw.cancelDraw();
        cylinderDraw.cancelDraw();
        sphereDraw.cancelDraw();
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

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1">
        <Scene
          selectedTool={selectedTool}
          snapEnabled={snapEnabled}
          drawState={activeDraw?.drawState ?? idleState}
          placedBoxes={boxDraw.placedBoxes}
          placedCylinders={cylinderDraw.placedCylinders}
          placedSpheres={sphereDraw.placedSpheres}
          onGroundRightClick={activeDraw?.handleGroundRightClick ?? noop}
          onGroundPointerMove={activeDraw?.handleGroundPointerMove ?? noop}
          onGroundClick={activeDraw?.handleGroundClick ?? noop}
          onHeightPointerMove={activeDraw?.handleHeightPointerMove ?? noop}
          onHeightClick={activeDraw?.handleHeightClick ?? noop}
        />
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <Menu
          selectedTool={selectedTool}
          onToolSelect={handleToolSelect}
          snapEnabled={snapEnabled}
          onSnapToggle={() => setSnapEnabled((v) => !v)}
        />
      </div>
    </div>
  );
};
