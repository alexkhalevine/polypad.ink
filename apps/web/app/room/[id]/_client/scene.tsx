"use client";

import * as THREE from "three";
import React, { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "@react-three/drei";
import { DrawState, DrawPhase, PlacedBox, PlacedCylinder, PlacedSphere, ToolType } from "./types";
import { GroundPlane } from "@/app/components/ground-plane";
import { HeightCapturePlane } from "@/app/components/height-capture-plane";
import { PreviewBox } from "@/app/components/preview-box";
import { PreviewCylinder } from "@/app/components/preview-cylinder";
import { PreviewSphere } from "@/app/components/preview-sphere";
import { PlacedBoxMesh } from "@/app/components/placed-box-mesh";
import { PlacedCylinderMesh } from "@/app/components/placed-cylinder-mesh";
import { PlacedSphereMesh } from "@/app/components/placed-sphere-mesh";

// ─── Context menu blocker ─────────────────────────────────────────────────────

function ContextMenuBlocker() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener("contextmenu", prevent);
    return () => el.removeEventListener("contextmenu", prevent);
  }, [gl.domElement]);
  return null;
}

// ─── Orbit controls ───────────────────────────────────────────────────────────

function CameraControls({ phase, orbitEnabled }: { phase: DrawPhase; orbitEnabled: boolean }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl.domElement]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = orbitEnabled && phase === "idle";
    }
  }, [phase, orbitEnabled]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}

// ─── Transform Controls (for move tool) ──────────────────────────────────────

function TransformGizmo({
  selectedObjectId,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  onObjectMove,
  onTransforming,
}: {
  selectedObjectId: string | null;
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  onObjectMove?: (objectId: string, newPosition: THREE.Vector3, persist: boolean) => void;
  onTransforming?: (isTransforming: boolean) => void;
}) {
  const { camera, gl } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformRef = useRef<any>(null);
  const draggingRef = useRef(false);

  // Find the selected object
  const allObjects = [
    ...placedBoxes.map((b) => ({ id: b.id, center: b.center })),
    ...placedCylinders.map((c) => ({ id: c.id, center: c.center })),
    ...placedSpheres.map((s) => ({ id: s.id, center: s.center })),
  ];

  const selected = selectedObjectId
    ? allObjects.find((o) => o.id === selectedObjectId)
    : null;

  const handleChange = () => {
    if (!transformRef.current || !selectedObjectId || !onObjectMove) return;
    const pos = transformRef.current.object?.position;
    if (pos) {
      onObjectMove(selectedObjectId, pos.clone(), false);
    }
    // Track dragging state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isDragging = (transformRef.current as any).dragging;
    if (isDragging && !draggingRef.current && onTransforming) {
      draggingRef.current = true;
      onTransforming(true);
    } else if (!isDragging && draggingRef.current && onTransforming) {
      draggingRef.current = false;
      onTransforming(false);
    }
  };

  const handleMouseUp = () => {
    if (!transformRef.current || !selectedObjectId || !onObjectMove) return;
    const pos = transformRef.current.object?.position;
    if (pos) {
      onObjectMove(selectedObjectId, pos.clone(), true);
    }
    draggingRef.current = false;
    if (onTransforming) {
      onTransforming(false);
    }
  };

  if (!selected) return null;

  return (
    <TransformControls
      ref={transformRef}
      camera={camera}
      domElement={gl.domElement}
      mode="translate"
      position={[selected.center.x, selected.center.y, selected.center.z]}
      onChange={handleChange}
      onMouseUp={handleMouseUp}
    />
  );
}

// ─── Snap utility ─────────────────────────────────────────────────────────────

export function snapPoint(p: THREE.Vector3, enabled: boolean): THREE.Vector3 {
  if (!enabled) return p;
  return new THREE.Vector3(Math.round(p.x), p.y, Math.round(p.z));
}

// ─── Scene props ──────────────────────────────────────────────────────────────

interface SceneProps {
  selectedTool: ToolType | null;
  snapEnabled: boolean;
  wireframeEnabled: boolean;
  drawState: DrawState;
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  selectionMode: "draw" | "select";
  onGroundRightClick: (point: THREE.Vector3) => void;
  onGroundPointerMove: (point: THREE.Vector3) => void;
  onGroundClick: (point: THREE.Vector3) => void;
  onHeightPointerMove: (worldY: number) => void;
  onHeightClick: (worldY: number) => void;
  onObjectClick: (objectId: string) => void;
  onObjectHover: (objectId: string | null) => void;
  onObjectMove?: (objectId: string, newPosition: THREE.Vector3, persist: boolean) => void;
  onTransforming?: (isTransforming: boolean) => void;
  transforming?: boolean;
}

// ─── Scene root ───────────────────────────────────────────────────────────────

function SceneContent({
  selectedTool,
  snapEnabled,
  wireframeEnabled,
  drawState,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  selectedObjectId,
  hoveredObjectId,
  selectionMode,
  onGroundRightClick,
  onGroundPointerMove,
  onGroundClick,
  onHeightPointerMove,
  onHeightClick,
  onObjectClick,
  onObjectHover,
  onObjectMove,
  onTransforming,
  transforming,
}: SceneProps) {
  const heightAnchorX =
    drawState.phase === "height"
      ? (drawState.start.x + drawState.end.x) / 2
      : 0;
  const heightAnchorZ =
    drawState.phase === "height"
      ? (drawState.start.z + drawState.end.z) / 2
      : 0;

  return (
    <>
      <ContextMenuBlocker />
      <CameraControls phase={drawState.phase} orbitEnabled={!transforming} />

      <ambientLight intensity={Math.PI / 2} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        decay={0}
        intensity={Math.PI}
      />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />

      <primitive object={new THREE.GridHelper(20, 20, "#444", "#333")} />

      {selectedTool === "move" && (
        <TransformGizmo
          selectedObjectId={selectedObjectId}
          placedBoxes={placedBoxes}
          placedCylinders={placedCylinders}
          placedSpheres={placedSpheres}
          onObjectMove={onObjectMove}
          onTransforming={onTransforming}
        />
      )}

      <GroundPlane
        phase={drawState.phase}
        toolActive={selectedTool !== null}
        onRightClick={(p) => onGroundRightClick(snapPoint(p, snapEnabled))}
        onPointerMove={(p) => onGroundPointerMove(snapPoint(p, snapEnabled))}
        onClick={(p) => onGroundClick(snapPoint(p, snapEnabled))}
      />

      <HeightCapturePlane
        active={drawState.phase === "height"}
        anchorX={heightAnchorX}
        anchorZ={heightAnchorZ}
        onPointerMove={onHeightPointerMove}
        onClick={onHeightClick}
      />

      {selectedTool === "box" && <PreviewBox drawState={drawState} />}
      {selectedTool === "cylinder" && <PreviewCylinder drawState={drawState} />}
      {selectedTool === "sphere" && <PreviewSphere drawState={drawState} />}

      {placedBoxes.map((box) => (
        <PlacedBoxMesh
          key={box.id}
          box={box}
          color={box.color}
          isSelected={box.id === selectedObjectId}
          isHovered={selectionMode === "select" && box.id === hoveredObjectId}
          wireframe={wireframeEnabled}
          onClick={() => { if (selectionMode === "select") onObjectClick(box.id); }}
          onPointerEnter={() => { if (selectionMode === "select") onObjectHover(box.id); }}
          onPointerLeave={() => { if (selectionMode === "select") onObjectHover(null); }}
        />
      ))}
      {placedCylinders.map((cylinder) => (
        <PlacedCylinderMesh
          key={cylinder.id}
          cylinder={cylinder}
          color={cylinder.color}
          isSelected={cylinder.id === selectedObjectId}
          isHovered={selectionMode === "select" && cylinder.id === hoveredObjectId}
          wireframe={wireframeEnabled}
          onClick={() => { if (selectionMode === "select") onObjectClick(cylinder.id); }}
          onPointerEnter={() => { if (selectionMode === "select") onObjectHover(cylinder.id); }}
          onPointerLeave={() => { if (selectionMode === "select") onObjectHover(null); }}
        />
      ))}
      {placedSpheres.map((sphere) => (
        <PlacedSphereMesh
          key={sphere.id}
          sphere={sphere}
          color={sphere.color}
          isSelected={sphere.id === selectedObjectId}
          isHovered={selectionMode === "select" && sphere.id === hoveredObjectId}
          wireframe={wireframeEnabled}
          onClick={() => { if (selectionMode === "select") onObjectClick(sphere.id); }}
          onPointerEnter={() => { if (selectionMode === "select") onObjectHover(sphere.id); }}
          onPointerLeave={() => { if (selectionMode === "select") onObjectHover(null); }}
        />
      ))}
    </>
  );
}

// ─── Canvas wrapper ───────────────────────────────────────────────────────────

export function Scene(props: SceneProps) {
  const cursor = props.drawState.phase !== "idle" ? "crosshair" : "default";

  return (
    <div className="w-full h-full" style={{ cursor }}>
      <Canvas
        camera={{ position: [5, 5, 8], fov: 50 }}
        style={{ width: "100%", height: "100%", background: "#1a1a1a" }}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
