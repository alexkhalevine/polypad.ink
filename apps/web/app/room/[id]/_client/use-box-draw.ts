import { useState, useCallback } from "react";
import * as THREE from "three";
import { DrawState, PlacedBox, HeightState } from "./types";

export interface UseBoxDrawReturn {
  drawState: DrawState;
  placedBoxes: PlacedBox[];
  handleGroundRightClick: (point: THREE.Vector3) => void;
  handleGroundPointerMove: (point: THREE.Vector3) => void;
  handleGroundClick: (point: THREE.Vector3) => void;
  handleHeightPointerMove: (worldY: number) => void;
  handleHeightClick: (worldY: number) => void;
  cancelDraw: () => void;
}

export function useBoxDraw(): UseBoxDrawReturn {
  const [drawState, setDrawState] = useState<DrawState>({ phase: "idle" });
  const [placedBoxes, setPlacedBoxes] = useState<PlacedBox[]>([]);

  const handleGroundRightClick = useCallback((point: THREE.Vector3) => {
    setDrawState({
      phase: "footprint",
      start: point.clone(),
      end: point.clone(),
    });
  }, []);

  const handleGroundPointerMove = useCallback((point: THREE.Vector3) => {
    setDrawState((prev) => {
      if (prev.phase !== "footprint") return prev;
      return { ...prev, end: point.clone() };
    });
  }, []);

  const handleGroundClick = useCallback((point: THREE.Vector3) => {
    setDrawState((prev) => {
      if (prev.phase !== "footprint") return prev;
      return {
        phase: "height",
        start: prev.start,
        end: point.clone(),
        currentHeight: 0.01,
      } satisfies HeightState;
    });
  }, []);

  const handleHeightPointerMove = useCallback((worldY: number) => {
    setDrawState((prev) => {
      if (prev.phase !== "height") return prev;
      return { ...prev, currentHeight: Math.max(0.01, worldY) };
    });
  }, []);

  const handleHeightClick = useCallback((worldY: number) => {
    setDrawState((prev) => {
      if (prev.phase !== "height") return prev;
      const height = Math.max(0.01, worldY);
      const box: PlacedBox = {
        id: crypto.randomUUID(),
        center: new THREE.Vector3(
          (prev.start.x + prev.end.x) / 2,
          height / 2,
          (prev.start.z + prev.end.z) / 2
        ),
        width: Math.max(0.01, Math.abs(prev.end.x - prev.start.x)),
        height,
        depth: Math.max(0.01, Math.abs(prev.end.z - prev.start.z)),
      };
      setPlacedBoxes((boxes) => [...boxes, box]);
      return { phase: "idle" };
    });
  }, []);

  const cancelDraw = useCallback(() => {
    setDrawState({ phase: "idle" });
  }, []);

  return {
    drawState,
    placedBoxes,
    handleGroundRightClick,
    handleGroundPointerMove,
    handleGroundClick,
    handleHeightPointerMove,
    handleHeightClick,
    cancelDraw,
  };
}
