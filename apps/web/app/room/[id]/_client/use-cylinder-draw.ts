import { useState, useCallback, useRef, useEffect } from "react";
import * as THREE from "three";
import { DrawState, PlacedCylinder, HeightState } from "./types";

function xzDist(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.max(0.01, Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2));
}

export interface UseCylinderDrawReturn {
  drawState: DrawState;
  placedCylinders: PlacedCylinder[];
  handleGroundRightClick: (point: THREE.Vector3) => void;
  handleGroundPointerMove: (point: THREE.Vector3) => void;
  handleGroundClick: (point: THREE.Vector3) => void;
  handleHeightPointerMove: (worldY: number) => void;
  handleHeightClick: (worldY: number) => void;
  cancelDraw: () => void;
  rollback: (id: string) => void;
}

interface UseCylinderDrawOptions {
  onPlace?: (cylinder: PlacedCylinder) => void;
}

export function useCylinderDraw(options?: UseCylinderDrawOptions): UseCylinderDrawReturn {
  const [drawState, setDrawState] = useState<DrawState>({ phase: "idle" });
  const [placedCylinders, setPlacedCylinders] = useState<PlacedCylinder[]>([]);
  const onPlaceRef = useRef(options?.onPlace);
  useEffect(() => {
    onPlaceRef.current = options?.onPlace;
  }, [options?.onPlace]);

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
      const radius = xzDist(prev.start, prev.end);
      const cylinder: PlacedCylinder = {
        id: crypto.randomUUID(),
        center: new THREE.Vector3(prev.start.x, height / 2, prev.start.z),
        radius,
        height,
        color: null,
      };
      setPlacedCylinders((cs) => [...cs, cylinder]);
      onPlaceRef.current?.(cylinder);
      return { phase: "idle" };
    });
  }, []);

  const rollback = useCallback((id: string) => {
    setPlacedCylinders((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const cancelDraw = useCallback(() => {
    setDrawState({ phase: "idle" });
  }, []);

  return {
    drawState,
    placedCylinders,
    handleGroundRightClick,
    handleGroundPointerMove,
    handleGroundClick,
    handleHeightPointerMove,
    handleHeightClick,
    cancelDraw,
    rollback,
  };
}
