"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { DrawState, PlacedBox, PlacedCylinder, PlacedSphere } from "./types";
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
import { useRoomStore } from "./room-store";

// ─── Snap utility ─────────────────────────────────────────────────────────────

export function snapPoint(p: THREE.Vector3, enabled: boolean): THREE.Vector3 {
  if (!enabled) return p;
  return new THREE.Vector3(Math.round(p.x), p.y, Math.round(p.z));
}

// ─── Scene props ──────────────────────────────────────────────────────────────

interface SceneProps {
  drawState: DrawState;
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  onGroundRightClick: (point: THREE.Vector3) => void;
  onGroundPointerMove: (point: THREE.Vector3) => void;
  onGroundClick: (point: THREE.Vector3) => void;
  onHeightPointerMove: (worldY: number) => void;
  onHeightClick: (worldY: number) => void;
  onObjectMove?: (objectId: string, newPosition: THREE.Vector3, persist: boolean) => void;
}

// ─── Scene root ───────────────────────────────────────────────────────────────

function SceneContent({
  drawState,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  onGroundRightClick,
  onGroundPointerMove,
  onGroundClick,
  onHeightPointerMove,
  onHeightClick,
  onObjectMove,
}: SceneProps) {
  const selectedTool = useRoomStore((s) => s.selectedTool);
  const snapEnabled = useRoomStore((s) => s.snapEnabled);
  const wireframeEnabled = useRoomStore((s) => s.wireframeEnabled);
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const hoveredObjectId = useRoomStore((s) => s.hoveredObjectId);
  const selectionMode = useRoomStore((s) => s.selectionMode);
  const livePositions = useRoomStore((s) => s.livePositions);
  const setSelectedObjectId = useRoomStore((s) => s.setSelectedObjectId);
  const setHoveredObjectId = useRoomStore((s) => s.setHoveredObjectId);

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
          positionOverride={livePositions[box.id]}
          color={box.color}
          isSelected={box.id === selectedObjectId}
          isHovered={selectionMode === "select" && box.id === hoveredObjectId}
          wireframe={wireframeEnabled}
          onClick={() => { if (selectionMode === "select") setSelectedObjectId(box.id); }}
          onPointerEnter={() => { if (selectionMode === "select") setHoveredObjectId(box.id); }}
          onPointerLeave={() => { if (selectionMode === "select") setHoveredObjectId(null); }}
        />
      ))}
      {placedCylinders.map((cylinder) => (
        <PlacedCylinderMesh
          key={cylinder.id}
          cylinder={cylinder}
          positionOverride={livePositions[cylinder.id]}
          color={cylinder.color}
          isSelected={cylinder.id === selectedObjectId}
          isHovered={selectionMode === "select" && cylinder.id === hoveredObjectId}
          wireframe={wireframeEnabled}
          onClick={() => { if (selectionMode === "select") setSelectedObjectId(cylinder.id); }}
          onPointerEnter={() => { if (selectionMode === "select") setHoveredObjectId(cylinder.id); }}
          onPointerLeave={() => { if (selectionMode === "select") setHoveredObjectId(null); }}
        />
      ))}
      {placedSpheres.map((sphere) => (
        <PlacedSphereMesh
          key={sphere.id}
          sphere={sphere}
          positionOverride={livePositions[sphere.id]}
          color={sphere.color}
          isSelected={sphere.id === selectedObjectId}
          isHovered={selectionMode === "select" && sphere.id === hoveredObjectId}
          wireframe={wireframeEnabled}
          onClick={() => { if (selectionMode === "select") setSelectedObjectId(sphere.id); }}
          onPointerEnter={() => { if (selectionMode === "select") setHoveredObjectId(sphere.id); }}
          onPointerLeave={() => { if (selectionMode === "select") setHoveredObjectId(null); }}
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
