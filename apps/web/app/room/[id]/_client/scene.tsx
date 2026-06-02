"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { DrawState, PlacedBox, PlacedCylinder, PlacedSphere, PlacedMesh, ExtrudeFace } from "./types";
import { ContextMenuBlocker } from "./context-menu-blocker";
import { TransformGizmo } from "./transform-gizmo";
import { AlignPreviewOverlay } from "./align-preview-overlay";
import { BooleanPreviewOverlay } from "./boolean-preview-overlay";
import { ClonePreviewOverlay } from "./clone-preview-overlay";
import { GroundPlane } from "@/app/components/ground-plane";
import { HeightCapturePlane } from "@/app/components/height-capture-plane";
import { PreviewBox } from "@/app/components/preview-box";
import { PreviewCylinder } from "@/app/components/preview-cylinder";
import { PreviewSphere } from "@/app/components/preview-sphere";
import { PlacedBoxMesh } from "@/app/components/placed-box-mesh";
import { PlacedCylinderMesh } from "@/app/components/placed-cylinder-mesh";
import { PlacedSphereMesh } from "@/app/components/placed-sphere-mesh";
import { PlacedMeshComponent } from "@/app/components/placed-mesh";
import { DimensionHelpers } from "@/app/components/dimension-helpers";
import { ExtrudeOverlay } from "@/app/components/extrude-overlay";
import { FaceHighlightOverlay } from "@/app/components/face-highlight-overlay";
import type { ExtrudeResult, ExtrudableType } from "./extrude-utils";
import { useRoomStore } from "./room-store";
import { RemoteCursors } from "./remote-cursors";
import { ExportHandler, PLACED_OBJECTS_GROUP } from "./export-handler";
import { useErrorStore } from "@/app/error-store";

const CURSOR_COLORS = ["#38bdf8", "#fb923c", "#a78bfa", "#34d399", "#f472b6", "#facc15"];

// ─── Snap utility ─────────────────────────────────────────────────────────────

export function snapPoint(p: THREE.Vector3, enabled: boolean): THREE.Vector3 {
  if (!enabled) return p;
  return new THREE.Vector3(Math.round(p.x), p.y, Math.round(p.z));
}

// ─── Scene props ──────────────────────────────────────────────────────────────

interface SceneProps {
  roomId: string;
  drawState: DrawState;
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  placedMeshes: PlacedMesh[];
  selectedObject: PlacedBox | PlacedCylinder | PlacedSphere | PlacedMesh | null;
  selectedObjectType: "box" | "cylinder" | "sphere" | "mesh" | null;
  onGroundStartDraw: (point: THREE.Vector3) => void;
  onGroundPointerMove: (point: THREE.Vector3) => void;
  onGroundClick: (point: THREE.Vector3) => void;
  onHeightPointerMove: (worldY: number) => void;
  onHeightClick: (worldY: number) => void;
  onObjectMove?: (objectId: string, newPosition: THREE.Vector3, persist: boolean) => void;
  onDragStart?: (objectId: string) => Promise<{ ok: boolean; lockedBy?: string }>;
  onDragEnd?: (objectId: string) => void;
  onDimensionCommit: (field: "width" | "height" | "depth" | "radius", value: number) => void;
  onExtrudeFaceSelect: (face: ExtrudeFace) => void;
  onExtrudeCommit: (result: ExtrudeResult) => void;
  onFaceSelect: (face: ExtrudeFace) => void;
}

// Resolve the picked face into a world-space plane descriptor (normal + a point on
// it). Objects are unrotated, so the local hit normal equals the world normal.
// Cylinder side faces (radial normal) are not extrudable — only the flat y caps.
function pickFace(
  e: ThreeEvent<MouseEvent>,
  type: "box" | "cylinder" | "mesh",
): ExtrudeFace | null {
  const n = e.face?.normal;
  if (!n) return null;
  if (type === "cylinder" && Math.abs(n.y) <= 0.9) return null;
  return {
    normal: { x: n.x, y: n.y, z: n.z },
    point: { x: e.point.x, y: e.point.y, z: e.point.z },
  };
}

// ─── Align helper (groups arrow + preview so target lookup stays local) ────────

function AlignSection({
  source,
  sourceType,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  alignTargetId,
}: {
  source: PlacedBox | PlacedCylinder | PlacedSphere;
  sourceType: "box" | "cylinder" | "sphere";
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  alignTargetId: string | null;
}) {
  const allObjects = useMemo(
    () => [...placedBoxes, ...placedCylinders, ...placedSpheres],
    [placedBoxes, placedCylinders, placedSpheres],
  );
  const target = useMemo(
    () => (alignTargetId ? allObjects.find((o) => o.id === alignTargetId) ?? null : null),
    [alignTargetId, allObjects],
  );
  const targetType = useMemo<"box" | "cylinder" | "sphere" | null>(() => {
    if (!alignTargetId) return null;
    if (placedBoxes.some((b) => b.id === alignTargetId)) return "box";
    if (placedCylinders.some((c) => c.id === alignTargetId)) return "cylinder";
    if (placedSpheres.some((s) => s.id === alignTargetId)) return "sphere";
    return null;
  }, [alignTargetId, placedBoxes, placedCylinders, placedSpheres]);

  return (
    <AlignPreviewOverlay
      source={source}
      sourceType={sourceType}
      target={target}
      targetType={targetType}
    />
  );
}

// ─── Boolean helper (groups source/target lookup for the live preview) ────────

function BooleanSection({
  source,
  sourceType,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  placedMeshes,
  booleanTargetId,
}: {
  source: PlacedBox | PlacedCylinder | PlacedSphere | PlacedMesh;
  sourceType: "box" | "cylinder" | "sphere" | "mesh";
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  placedMeshes: PlacedMesh[];
  booleanTargetId: string | null;
}) {
  const target = useMemo(() => {
    if (!booleanTargetId) return null;
    return (
      placedBoxes.find((b) => b.id === booleanTargetId) ??
      placedCylinders.find((c) => c.id === booleanTargetId) ??
      placedSpheres.find((s) => s.id === booleanTargetId) ??
      placedMeshes.find((m) => m.id === booleanTargetId) ??
      null
    );
  }, [booleanTargetId, placedBoxes, placedCylinders, placedSpheres, placedMeshes]);

  const targetType = useMemo<"box" | "cylinder" | "sphere" | "mesh" | null>(() => {
    if (!booleanTargetId) return null;
    if (placedBoxes.some((b) => b.id === booleanTargetId)) return "box";
    if (placedCylinders.some((c) => c.id === booleanTargetId)) return "cylinder";
    if (placedSpheres.some((s) => s.id === booleanTargetId)) return "sphere";
    if (placedMeshes.some((m) => m.id === booleanTargetId)) return "mesh";
    return null;
  }, [booleanTargetId, placedBoxes, placedCylinders, placedSpheres, placedMeshes]);

  if (!target || !targetType) return null;
  return (
    <BooleanPreviewOverlay
      source={source}
      sourceKind={sourceType}
      target={target}
      targetKind={targetType}
    />
  );
}

// ─── Scene root ───────────────────────────────────────────────────────────────

function SceneContent({
  roomId,
  drawState,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  placedMeshes,
  selectedObject,
  selectedObjectType,
  onGroundStartDraw,
  onGroundPointerMove,
  onGroundClick,
  onHeightPointerMove,
  onHeightClick,
  onObjectMove,
  onDragStart,
  onDragEnd,
  onDimensionCommit,
  onExtrudeFaceSelect,
  onExtrudeCommit,
  onFaceSelect,
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
  const setAlignTargetId = useRoomStore((s) => s.setAlignTargetId);
  const setBooleanTargetId = useRoomStore((s) => s.setBooleanTargetId);
  const objectLocks = useRoomStore((s) => s.objectLocks);
  const remoteUsers = useRoomStore((s) => s.remoteUsers);
  const localUserId = useRoomStore((s) => s.localUserId);
  const alignTargetId = useRoomStore((s) => s.alignTargetId);
  const booleanTargetId = useRoomStore((s) => s.booleanTargetId);
  const clonePreviewPosition = useRoomStore((s) => s.clonePreviewPosition);
  const extrudeFace = useRoomStore((s) => s.extrudeFace);
  const isExtrudeDragging = useRoomStore((s) => s.isExtrudeDragging);
  const selectedFace = useRoomStore((s) => s.selectedFace);

  const remoteUserEntries = Object.entries(remoteUsers);
  function getLockInfo(objectId: string) {
    const lockingUserId = objectLocks[objectId];
    if (!lockingUserId || lockingUserId === localUserId) return undefined;
    const idx = remoteUserEntries.findIndex(([uid]) => uid === lockingUserId);
    if (idx === -1) return undefined;
    return { color: CURSOR_COLORS[idx % CURSOR_COLORS.length], displayName: remoteUserEntries[idx][1].displayName };
  }

  // Visual cue for an object currently selected by a remote peer. Skipped when the same
  // peer is also dragging it (lockInfo takes precedence — drag is the louder signal).
  function getSelectionInfo(objectId: string) {
    const idx = remoteUserEntries.findIndex(([, presence]) => presence.selectedObjectId === objectId);
    if (idx === -1) return undefined;
    const [holderId, presence] = remoteUserEntries[idx];
    if (objectLocks[objectId] === holderId) return undefined;
    return { color: CURSOR_COLORS[idx % CURSOR_COLORS.length], displayName: presence.displayName };
  }

  function tryLocalSelect(objectId: string) {
    if (selectedTool === "align") {
      if (objectId !== selectedObjectId) setAlignTargetId(objectId);
      return;
    }
    if (selectedTool === "boolean") {
      if (objectId !== selectedObjectId) setBooleanTargetId(objectId);
      return;
    }
    if (selectionMode !== "select") return;
    const remote = getSelectionInfo(objectId);
    if (remote) {
      useErrorStore.getState().addError(`Selected by ${remote.displayName}.`);
      return;
    }
    setSelectedObjectId(objectId);
  }

  // While the extrude tool is active, a click on the selected object's mesh picks a
  // face instead of (re)selecting; otherwise fall back to normal selection.
  function handleObjectClick(
    objectId: string,
    type: ExtrudableType,
    e: ThreeEvent<MouseEvent>,
  ) {
    if (selectedTool === "extrude") {
      if (objectId !== selectedObjectId) return;
      const f = pickFace(e, type);
      if (f) onExtrudeFaceSelect(f);
      return;
    }
    if (selectedTool === "face") {
      if (objectId !== selectedObjectId) return;
      const f = pickFace(e, type);
      if (f) onFaceSelect(f);
      return;
    }
    tryLocalSelect(objectId);
  }

  // Once a face is picked, the extrude overlay renders the (live) preview of the
  // selected object, so the original is hidden to avoid z-fighting.
  const extrudeActive =
    selectedTool === "extrude" &&
    !!extrudeFace &&
    !!selectedObject &&
    (selectedObjectType === "box" ||
      selectedObjectType === "cylinder" ||
      selectedObjectType === "mesh");
  const hiddenForExtrude = extrudeActive ? selectedObjectId : null;

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
        enabled={selectedTool !== "align" && selectedTool !== "boolean" && !isExtrudeDragging}
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
          placedMeshes={placedMeshes}
          onObjectMove={onObjectMove}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      )}

      {selectedTool === "align" &&
        selectedObject &&
        selectedObjectType &&
        selectedObjectType !== "mesh" && (
          <AlignSection
            source={selectedObject as PlacedBox | PlacedCylinder | PlacedSphere}
            sourceType={selectedObjectType as "box" | "cylinder" | "sphere"}
            placedBoxes={placedBoxes}
            placedCylinders={placedCylinders}
            placedSpheres={placedSpheres}
            alignTargetId={alignTargetId}
          />
        )}

      {selectedTool === "boolean" && selectedObject && selectedObjectType && (
        <BooleanSection
          source={selectedObject}
          sourceType={selectedObjectType}
          placedBoxes={placedBoxes}
          placedCylinders={placedCylinders}
          placedSpheres={placedSpheres}
          placedMeshes={placedMeshes}
          booleanTargetId={booleanTargetId}
        />
      )}

      {selectedTool === "clone" && selectedObject && selectedObjectType && clonePreviewPosition && (
        <ClonePreviewOverlay
          source={selectedObject}
          sourceType={selectedObjectType}
          position={clonePreviewPosition}
        />
      )}

      {selectionMode === "select" &&
        selectedObject &&
        selectedObjectType &&
        selectedObjectType !== "mesh" && (
          <DimensionHelpers
            selectedObject={selectedObject as PlacedBox | PlacedCylinder | PlacedSphere}
            selectedObjectType={selectedObjectType as "box" | "cylinder" | "sphere"}
            positionOverride={livePositions[selectedObject.id]}
            onDimensionCommit={onDimensionCommit}
          />
        )}

      {extrudeActive && selectedObject && extrudeFace && (
        <ExtrudeOverlay
          selectedObject={selectedObject as PlacedBox | PlacedCylinder | PlacedMesh}
          selectedObjectType={selectedObjectType as ExtrudableType}
          face={extrudeFace}
          color={selectedObject.color}
          snapEnabled={snapEnabled}
          onExtrudeCommit={onExtrudeCommit}
        />
      )}

      {selectedTool === "face" &&
        selectedObjectType === "mesh" &&
        selectedObject &&
        selectedFace?.objectId === selectedObject.id && (
          <FaceHighlightOverlay mesh={selectedObject as PlacedMesh} face={selectedFace} />
        )}

      <GroundPlane
        phase={drawState.phase}
        toolActive={selectedTool !== null}
        clickMode={selectedTool === "clone" ? "place" : "draw"}
        onStartDraw={(p) => onGroundStartDraw(snapPoint(p, snapEnabled))}
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

      <group name={PLACED_OBJECTS_GROUP}>
        {placedBoxes.map((box) => box.id === hiddenForExtrude ? null : (
          <PlacedBoxMesh
            key={box.id}
            box={box}
            positionOverride={livePositions[box.id]}
            color={box.color}
            isSelected={box.id === selectedObjectId}
            isHovered={(selectionMode === "select" || selectedTool === "align" || selectedTool === "boolean") && box.id === hoveredObjectId}
            wireframe={wireframeEnabled}
            lockInfo={getLockInfo(box.id)}
            selectionInfo={getSelectionInfo(box.id)}
            onClick={(e) => handleObjectClick(box.id, "box", e)}
            onPointerEnter={() => { if (selectionMode === "select" || selectedTool === "align" || selectedTool === "boolean") setHoveredObjectId(box.id); }}
            onPointerLeave={() => { if (selectionMode === "select" || selectedTool === "align" || selectedTool === "boolean") setHoveredObjectId(null); }}
          />
        ))}
        {placedCylinders.map((cylinder) => cylinder.id === hiddenForExtrude ? null : (
          <PlacedCylinderMesh
            key={cylinder.id}
            cylinder={cylinder}
            positionOverride={livePositions[cylinder.id]}
            color={cylinder.color}
            isSelected={cylinder.id === selectedObjectId}
            isHovered={(selectionMode === "select" || selectedTool === "align" || selectedTool === "boolean") && cylinder.id === hoveredObjectId}
            wireframe={wireframeEnabled}
            lockInfo={getLockInfo(cylinder.id)}
            selectionInfo={getSelectionInfo(cylinder.id)}
            onClick={(e) => handleObjectClick(cylinder.id, "cylinder", e)}
            onPointerEnter={() => { if (selectionMode === "select" || selectedTool === "align" || selectedTool === "boolean") setHoveredObjectId(cylinder.id); }}
            onPointerLeave={() => { if (selectionMode === "select" || selectedTool === "align" || selectedTool === "boolean") setHoveredObjectId(null); }}
          />
        ))}
        {placedSpheres.map((sphere) => (
          <PlacedSphereMesh
            key={sphere.id}
            sphere={sphere}
            positionOverride={livePositions[sphere.id]}
            color={sphere.color}
            isSelected={sphere.id === selectedObjectId}
            isHovered={(selectionMode === "select" || selectedTool === "align" || selectedTool === "boolean") && sphere.id === hoveredObjectId}
            wireframe={wireframeEnabled}
            lockInfo={getLockInfo(sphere.id)}
            selectionInfo={getSelectionInfo(sphere.id)}
            onClick={() => tryLocalSelect(sphere.id)}
            onPointerEnter={() => { if (selectionMode === "select" || selectedTool === "align" || selectedTool === "boolean") setHoveredObjectId(sphere.id); }}
            onPointerLeave={() => { if (selectionMode === "select" || selectedTool === "align" || selectedTool === "boolean") setHoveredObjectId(null); }}
          />
        ))}
        {placedMeshes.map((mesh) => mesh.id === hiddenForExtrude ? null : (
          <PlacedMeshComponent
            key={mesh.id}
            mesh={mesh}
            positionOverride={livePositions[mesh.id]}
            color={mesh.color}
            isSelected={selectedTool === "face" ? selectedFace?.objectId === mesh.id : mesh.id === selectedObjectId}
            isHovered={(selectionMode === "select" || selectedTool === "boolean" || selectedTool === "face") && mesh.id === hoveredObjectId}
            wireframe={wireframeEnabled}
            lockInfo={getLockInfo(mesh.id)}
            selectionInfo={getSelectionInfo(mesh.id)}
            onClick={(e) => handleObjectClick(mesh.id, "mesh", e)}
            onPointerEnter={() => { if (selectionMode === "select" || selectedTool === "boolean" || selectedTool === "face") setHoveredObjectId(mesh.id); }}
            onPointerLeave={() => { if (selectionMode === "select" || selectedTool === "boolean" || selectedTool === "face") setHoveredObjectId(null); }}
          />
        ))}
      </group>

      <ExportHandler roomId={roomId} />
      <RemoteCursors />
    </>
  );
}

// ─── Canvas wrapper ───────────────────────────────────────────────────────────

export function Scene(props: SceneProps) {
  const selectionMode = useRoomStore((s) => s.selectionMode);
  const selectedTool = useRoomStore((s) => s.selectedTool);
  const cursor =
    selectedTool === "align" || selectedTool === "boolean"
      ? "pointer"
      : selectedTool === "clone" || props.drawState.phase !== "idle" || selectionMode === "select"
      ? "crosshair"
      : "default";

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
