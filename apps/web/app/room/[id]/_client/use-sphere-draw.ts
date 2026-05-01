import { useState, useCallback, useRef, useEffect } from "react";
import * as THREE from "three";
import { DrawState, PlacedSphere } from "./types";

function xzDist(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.max(0.01, Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2));
}

export interface UseSphereDrawReturn {
  drawState: DrawState;
  placedSpheres: PlacedSphere[];
  handleGroundRightClick: (point: THREE.Vector3) => void;
  handleGroundPointerMove: (point: THREE.Vector3) => void;
  handleGroundClick: (point: THREE.Vector3) => void;
  handleHeightPointerMove: (worldY: number) => void;
  handleHeightClick: (worldY: number) => void;
  cancelDraw: () => void;
  rollback: (id: string) => void;
}

interface UseSphereDrawOptions {
  onPlace?: (sphere: PlacedSphere) => void;
}

export function useSphereDraw(options?: UseSphereDrawOptions): UseSphereDrawReturn {
  const [drawState, setDrawState] = useState<DrawState>({ phase: "idle" });
  const [placedSpheres, setPlacedSpheres] = useState<PlacedSphere[]>([]);
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

  // Commits immediately — no height phase for sphere
  const handleGroundClick = useCallback((point: THREE.Vector3) => {
    setDrawState((prev) => {
      if (prev.phase !== "footprint") return prev;
      const radius = xzDist(prev.start, point);
      const sphere: PlacedSphere = {
        id: crypto.randomUUID(),
        center: new THREE.Vector3(prev.start.x, radius, prev.start.z),
        radius,
        color: null,
      };
      setPlacedSpheres((ss) => [...ss, sphere]);
      onPlaceRef.current?.(sphere);
      return { phase: "idle" };
    });
  }, []);

  const handleHeightPointerMove = useCallback(() => {}, []);
  const handleHeightClick = useCallback(() => {}, []);

  const rollback = useCallback((id: string) => {
    setPlacedSpheres((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const cancelDraw = useCallback(() => {
    setDrawState({ phase: "idle" });
  }, []);

  return {
    drawState,
    placedSpheres,
    handleGroundRightClick,
    handleGroundPointerMove,
    handleGroundClick,
    handleHeightPointerMove,
    handleHeightClick,
    cancelDraw,
    rollback,
  };
}
