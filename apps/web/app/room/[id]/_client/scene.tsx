"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { DrawState, PlacedBox, PlacedCylinder, PlacedSphere, ToolType } from "./types";
import { ContextMenuBlocker } from "./context-menu-blocker";
import { TransformGizmo } from "./transform-gizmo";
import { GroundPlane } from "@/app/components/ground-plane";
import { HeightCapturePlane } from "@/app/components/height-capture-plane";
import { PreviewBox } from "@/app/components/preview-box";
import { PreviewCylinder } from "@/app/components/preview-cylinder";
import { PreviewSphere } from "@/app/components/preview-sphere";
import { PlacedBoxMesh } from "@/app/components/placed-box-mesh";
import { PlacedCylinderMesh } from "@/app/components/placed-cylinder-mesh";
import { PlacedSphereMesh } from "@/app/components/placed-sphere-mesh";

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
  positionOverrides?: Record<string, { x: number; y: number; z: number }>;
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
  positionOverrides,
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
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
      />

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
          positionOverride={positionOverrides?.[box.id]}
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
          positionOverride={positionOverrides?.[cylinder.id]}
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
          positionOverride={positionOverrides?.[sphere.id]}
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
