"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { DrawState, PlacedBox, PlacedCylinder, PlacedSphere, PlacedCone, PlacedMesh, FaceKey, MateMode } from "./types";
import { ContextMenuBlocker } from "./context-menu-blocker";
import { TransformGizmo } from "./transform-gizmo";
import { BooleanPreviewOverlay } from "./boolean-preview-overlay";
import { ClonePreviewOverlay } from "./clone-preview-overlay";
import { FaceOverlay } from "./face-overlay";
import { MatePreviewOverlay } from "./mate-preview-overlay";
import { aabbOf, Shape, ShapeType } from "./align-math";
import { GroundPlane } from "@/app/components/ground-plane";
import { HeightCapturePlane } from "@/app/components/height-capture-plane";
import { PreviewBox } from "@/app/components/preview-box";
import { PreviewCylinder } from "@/app/components/preview-cylinder";
import { PreviewSphere } from "@/app/components/preview-sphere";
import { PreviewCone } from "@/app/components/preview-cone";
import { PlacedBoxMesh } from "@/app/components/placed-box-mesh";
import { PlacedCylinderMesh } from "@/app/components/placed-cylinder-mesh";
import { PlacedSphereMesh } from "@/app/components/placed-sphere-mesh";
import { PlacedConeMesh } from "@/app/components/placed-cone-mesh";
import { PlacedMeshComponent } from "@/app/components/placed-mesh";
import { DimensionHelpers } from "@/app/components/dimension-helpers";
import { useRoomStore } from "./room-store";
import { DimensionPatch } from "./queries/use-update-object-dimensions";
import { RemoteCursors } from "./remote-cursors";
import { ExportHandler, PLACED_OBJECTS_GROUP } from "./export-handler";
import { useErrorStore } from "@/app/error-store";

const CURSOR_COLORS = ["#38bdf8", "#fb923c", "#a78bfa", "#34d399", "#f472b6", "#facc15"];

// ─── Snap utility ─────────────────────────────────────────────────────────────

export function snapPoint(p: THREE.Vector3, enabled: boolean): THREE.Vector3 {
  if (!enabled) return p;
  return new THREE.Vector3(Math.round(p.x), p.y, Math.round(p.z));
}

// ─── Face-pick utility ──────────────────────────────────────────────────────
// Given a world-space point on (or near) a parametric shape, finds the AABB
// face it's closest to. Used by Face Mate's click/hover handling — geometry
// stays axis-aligned in v1, same limitation align-math already documents.

function nearestFaceKey(point: THREE.Vector3, aabb: ReturnType<typeof aabbOf>): FaceKey {
  const candidates: [FaceKey, number][] = [
    ["-x", Math.abs(point.x - aabb.min.x)],
    ["+x", Math.abs(point.x - aabb.max.x)],
    ["-y", Math.abs(point.y - aabb.min.y)],
    ["+y", Math.abs(point.y - aabb.max.y)],
    ["-z", Math.abs(point.z - aabb.min.z)],
    ["+z", Math.abs(point.z - aabb.max.z)],
  ];
  return candidates.reduce((best, cur) => (cur[1] < best[1] ? cur : best))[0];
}

// ─── Scene props ──────────────────────────────────────────────────────────────

interface SceneProps {
  roomId: string;
  drawState: DrawState;
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  placedCones: PlacedCone[];
  placedMeshes: PlacedMesh[];
  selectedObject: PlacedBox | PlacedCylinder | PlacedSphere | PlacedCone | PlacedMesh | null;
  selectedObjectType: "box" | "cylinder" | "sphere" | "cone" | "mesh" | null;
  onGroundStartDraw: (point: THREE.Vector3) => void;
  onGroundPointerMove: (point: THREE.Vector3) => void;
  onGroundClick: (point: THREE.Vector3) => void;
  onHeightPointerMove: (worldY: number) => void;
  onHeightClick: (worldY: number) => void;
  onObjectMove?: (objectId: string, newPosition: THREE.Vector3, persist: boolean) => void;
  onObjectRotate?: (
    objectId: string,
    euler: { x: number; y: number; z: number },
    persist: boolean,
  ) => void;
  onObjectScale?: (objectId: string, dimensions: DimensionPatch, persist: boolean) => void;
  onDragStart?: (objectId: string) => Promise<{ ok: boolean; lockedBy?: string }>;
  onDragEnd?: (objectId: string) => void;
  onDimensionCommit: (field: "width" | "height" | "depth" | "radius", value: number) => void;
}

// ─── Boolean helper (groups source/target lookup for the live preview) ────────

function BooleanSection({
  source,
  sourceType,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  placedCones,
  placedMeshes,
  booleanTargetId,
}: {
  source: PlacedBox | PlacedCylinder | PlacedSphere | PlacedCone | PlacedMesh;
  sourceType: "box" | "cylinder" | "sphere" | "cone" | "mesh";
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  placedCones: PlacedCone[];
  placedMeshes: PlacedMesh[];
  booleanTargetId: string | null;
}) {
  const target = useMemo(() => {
    if (!booleanTargetId) return null;
    return (
      placedBoxes.find((b) => b.id === booleanTargetId) ??
      placedCylinders.find((c) => c.id === booleanTargetId) ??
      placedSpheres.find((s) => s.id === booleanTargetId) ??
      placedCones.find((c) => c.id === booleanTargetId) ??
      placedMeshes.find((m) => m.id === booleanTargetId) ??
      null
    );
  }, [booleanTargetId, placedBoxes, placedCylinders, placedSpheres, placedCones, placedMeshes]);

  const targetType = useMemo<"box" | "cylinder" | "sphere" | "cone" | "mesh" | null>(() => {
    if (!booleanTargetId) return null;
    if (placedBoxes.some((b) => b.id === booleanTargetId)) return "box";
    if (placedCylinders.some((c) => c.id === booleanTargetId)) return "cylinder";
    if (placedSpheres.some((s) => s.id === booleanTargetId)) return "sphere";
    if (placedCones.some((c) => c.id === booleanTargetId)) return "cone";
    if (placedMeshes.some((m) => m.id === booleanTargetId)) return "mesh";
    return null;
  }, [booleanTargetId, placedBoxes, placedCylinders, placedSpheres, placedCones, placedMeshes]);

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

// ─── Face Mate helper (hover/source/target highlights + ghost preview) ───────

function MateSection({
  placedBoxes,
  placedCylinders,
  placedSpheres,
  placedCones,
  mateSource,
  mateTarget,
  hoveredFace,
  mateMode,
  mateOffset,
}: {
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  placedCones: PlacedCone[];
  mateSource: { objectId: string; faceKey: FaceKey } | null;
  mateTarget: { objectId: string; faceKey: FaceKey } | null;
  hoveredFace: { objectId: string; faceKey: FaceKey } | null;
  mateMode: MateMode;
  mateOffset: number;
}) {
  const findShapeAndType = (id: string): { shape: Shape; type: ShapeType } | null => {
    const box = placedBoxes.find((b) => b.id === id);
    if (box) return { shape: box, type: "box" };
    const cyl = placedCylinders.find((c) => c.id === id);
    if (cyl) return { shape: cyl, type: "cylinder" };
    const sph = placedSpheres.find((s) => s.id === id);
    if (sph) return { shape: sph, type: "sphere" };
    const cone = placedCones.find((c) => c.id === id);
    if (cone) return { shape: cone, type: "cone" };
    return null;
  };

  const sourceEntry = mateSource ? findShapeAndType(mateSource.objectId) : null;
  const targetEntry = mateTarget ? findShapeAndType(mateTarget.objectId) : null;

  const hoverIsSource = !!(mateSource && hoveredFace && hoveredFace.objectId === mateSource.objectId && hoveredFace.faceKey === mateSource.faceKey);
  const hoverIsTarget = !!(mateTarget && hoveredFace && hoveredFace.objectId === mateTarget.objectId && hoveredFace.faceKey === mateTarget.faceKey);
  const hoverEntry = hoveredFace && !hoverIsSource && !hoverIsTarget ? findShapeAndType(hoveredFace.objectId) : null;

  return (
    <>
      {hoverEntry && hoveredFace && (
        <FaceOverlay shape={hoverEntry.shape} type={hoverEntry.type} faceKey={hoveredFace.faceKey} color="#ffffff" fillOpacity={0.12} />
      )}
      {sourceEntry && mateSource && (
        <FaceOverlay
          shape={sourceEntry.shape}
          type={sourceEntry.type}
          faceKey={mateSource.faceKey}
          color="#4fe3c1"
          fillOpacity={0.3}
          label="Source face"
          labelTextColor="#072019"
        />
      )}
      {targetEntry && mateTarget && (
        <FaceOverlay
          shape={targetEntry.shape}
          type={targetEntry.type}
          faceKey={mateTarget.faceKey}
          color="#8b6dff"
          fillOpacity={0.3}
          label="Target face"
          labelTextColor="#ffffff"
        />
      )}
      {sourceEntry && targetEntry && mateSource && mateTarget && (
        <MatePreviewOverlay
          source={sourceEntry.shape}
          sourceType={sourceEntry.type}
          sourceFaceKey={mateSource.faceKey}
          target={targetEntry.shape}
          targetType={targetEntry.type}
          targetFaceKey={mateTarget.faceKey}
          mode={mateMode}
          offset={mateOffset}
        />
      )}
    </>
  );
}

// ─── Zoom sync (camera.zoom driven by the status bar +/- buttons) ─────────────

function ZoomController() {
  const zoomLevel = useRoomStore((s) => s.zoomLevel);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    camera.zoom = zoomLevel / 100;
    camera.updateProjectionMatrix();
  }, [camera, zoomLevel]);

  return null;
}

// ─── Scene root ───────────────────────────────────────────────────────────────

function SceneContent({
  roomId,
  drawState,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  placedCones,
  placedMeshes,
  selectedObject,
  selectedObjectType,
  onGroundStartDraw,
  onGroundPointerMove,
  onGroundClick,
  onHeightPointerMove,
  onHeightClick,
  onObjectMove,
  onObjectRotate,
  onObjectScale,
  onDragStart,
  onDragEnd,
  onDimensionCommit,
}: SceneProps) {
  const selectedTool = useRoomStore((s) => s.selectedTool);
  const snapEnabled = useRoomStore((s) => s.snapEnabled);
  const wireframeEnabled = useRoomStore((s) => s.wireframeEnabled);
  const gridOpacity = useRoomStore((s) => s.gridOpacity);
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const selectedObjectIds = useRoomStore((s) => s.selectedObjectIds);
  const anchorId = useRoomStore((s) => s.anchorId);
  const hoveredObjectId = useRoomStore((s) => s.hoveredObjectId);
  const selectionMode = useRoomStore((s) => s.selectionMode);
  const livePositions = useRoomStore((s) => s.livePositions);
  const selectObject = useRoomStore((s) => s.selectObject);
  const setHoveredObjectId = useRoomStore((s) => s.setHoveredObjectId);
  const setBooleanTargetId = useRoomStore((s) => s.setBooleanTargetId);
  const objectLocks = useRoomStore((s) => s.objectLocks);
  const remoteUsers = useRoomStore((s) => s.remoteUsers);
  const localUserId = useRoomStore((s) => s.localUserId);
  const booleanTargetId = useRoomStore((s) => s.booleanTargetId);
  const clonePreviewPosition = useRoomStore((s) => s.clonePreviewPosition);
  const mateSource = useRoomStore((s) => s.mateSource);
  const mateTarget = useRoomStore((s) => s.mateTarget);
  const hoveredFace = useRoomStore((s) => s.hoveredFace);
  const mateMode = useRoomStore((s) => s.mateMode);
  const mateOffset = useRoomStore((s) => s.mateOffset);
  const setMateSource = useRoomStore((s) => s.setMateSource);
  const setMateTarget = useRoomStore((s) => s.setMateTarget);
  const setHoveredFace = useRoomStore((s) => s.setHoveredFace);

  const isMultiSelectActive = selectedObjectIds.length >= 2;

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

  // Align math (and Face Mate) only know parametric primitives — meshes aren't supported.
  function findShapeAndType(id: string): { shape: Shape; type: ShapeType } | null {
    const box = placedBoxes.find((b) => b.id === id);
    if (box) return { shape: box, type: "box" };
    const cyl = placedCylinders.find((c) => c.id === id);
    if (cyl) return { shape: cyl, type: "cylinder" };
    const sph = placedSpheres.find((s) => s.id === id);
    if (sph) return { shape: sph, type: "sphere" };
    const cone = placedCones.find((c) => c.id === id);
    if (cone) return { shape: cone, type: "cone" };
    return null;
  }

  function tryFacePick(objectId: string, point: THREE.Vector3) {
    const entry = findShapeAndType(objectId);
    if (!entry) return;
    const faceKey = nearestFaceKey(point, aabbOf(entry.shape, entry.type));
    if (!mateSource || objectId === mateSource.objectId) {
      setMateSource({ objectId, faceKey });
      setMateTarget(null);
      return;
    }
    setMateTarget({ objectId, faceKey });
  }

  function handleFaceHover(objectId: string, point: THREE.Vector3) {
    const entry = findShapeAndType(objectId);
    if (!entry) return;
    const faceKey = nearestFaceKey(point, aabbOf(entry.shape, entry.type));
    setHoveredFace({ objectId, faceKey });
  }

  function tryLocalSelect(objectId: string, e: ThreeEvent<MouseEvent>) {
    if (selectedTool === "mate") {
      tryFacePick(objectId, e.point);
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
    selectObject(objectId, { additive: e.shiftKey });
  }

  const heightAnchorX =
    drawState.phase === "height"
      ? (drawState.start.x + drawState.end.x) / 2
      : 0;
  const heightAnchorZ =
    drawState.phase === "height"
      ? (drawState.start.z + drawState.end.z) / 2
      : 0;

  const grid = useMemo(() => {
    const helper = new THREE.GridHelper(20, 20, "#3a3550", "#1d1b2b");
    const material = helper.material as THREE.Material;
    material.transparent = true;
    material.opacity = gridOpacity;
    return helper;
  }, [gridOpacity]);

  return (
    <>
      <ContextMenuBlocker />
      <ZoomController />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        enabled={selectedTool !== "boolean" && selectedTool !== "mate"}
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

      <primitive object={grid} />

      {(selectedTool === "move" || selectedTool === "rotate" || selectedTool === "scale") && (
        <TransformGizmo
          mode={
            selectedTool === "rotate"
              ? "rotate"
              : selectedTool === "scale"
                ? "scale"
                : "translate"
          }
          selectedObjectId={selectedObjectId}
          placedBoxes={placedBoxes}
          placedCylinders={placedCylinders}
          placedSpheres={placedSpheres}
          placedCones={placedCones}
          placedMeshes={placedMeshes}
          onObjectMove={onObjectMove}
          onObjectRotate={onObjectRotate}
          onObjectScale={onObjectScale}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      )}

      {selectedTool === "boolean" && selectedObject && selectedObjectType && (
        <BooleanSection
          source={selectedObject}
          sourceType={selectedObjectType}
          placedBoxes={placedBoxes}
          placedCylinders={placedCylinders}
          placedSpheres={placedSpheres}
          placedCones={placedCones}
          placedMeshes={placedMeshes}
          booleanTargetId={booleanTargetId}
        />
      )}

      {selectedTool === "mate" && (
        <MateSection
          placedBoxes={placedBoxes}
          placedCylinders={placedCylinders}
          placedSpheres={placedSpheres}
          placedCones={placedCones}
          mateSource={mateSource}
          mateTarget={mateTarget}
          hoveredFace={hoveredFace}
          mateMode={mateMode}
          mateOffset={mateOffset}
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
            selectedObject={selectedObject as PlacedBox | PlacedCylinder | PlacedSphere | PlacedCone}
            selectedObjectType={selectedObjectType as "box" | "cylinder" | "sphere" | "cone"}
            positionOverride={livePositions[selectedObject.id]}
            onDimensionCommit={onDimensionCommit}
          />
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
      {selectedTool === "cone" && <PreviewCone drawState={drawState} />}

      <group name={PLACED_OBJECTS_GROUP}>
        {placedBoxes.map((box) => (
          <PlacedBoxMesh
            key={box.id}
            box={box}
            positionOverride={livePositions[box.id]}
            color={box.color}
            isSelected={box.id === selectedObjectId}
            isAnchor={box.id === anchorId}
            isMultiSelected={isMultiSelectActive && selectedObjectIds.includes(box.id) && box.id !== anchorId}
            isHovered={(selectionMode === "select" || selectedTool === "boolean") && box.id === hoveredObjectId}
            wireframe={wireframeEnabled}
            lockInfo={getLockInfo(box.id)}
            selectionInfo={getSelectionInfo(box.id)}
            onClick={(e) => tryLocalSelect(box.id, e)}
            onPointerEnter={() => { if (selectionMode === "select" || selectedTool === "boolean") setHoveredObjectId(box.id); }}
            onPointerLeave={() => {
              if (selectionMode === "select" || selectedTool === "boolean") setHoveredObjectId(null);
              if (selectedTool === "mate" && hoveredFace?.objectId === box.id) setHoveredFace(null);
            }}
            onPointerMove={(e) => { if (selectedTool === "mate") handleFaceHover(box.id, e.point); }}
          />
        ))}
        {placedCylinders.map((cylinder) => (
          <PlacedCylinderMesh
            key={cylinder.id}
            cylinder={cylinder}
            positionOverride={livePositions[cylinder.id]}
            color={cylinder.color}
            isSelected={cylinder.id === selectedObjectId}
            isAnchor={cylinder.id === anchorId}
            isMultiSelected={isMultiSelectActive && selectedObjectIds.includes(cylinder.id) && cylinder.id !== anchorId}
            isHovered={(selectionMode === "select" || selectedTool === "boolean") && cylinder.id === hoveredObjectId}
            wireframe={wireframeEnabled}
            lockInfo={getLockInfo(cylinder.id)}
            selectionInfo={getSelectionInfo(cylinder.id)}
            onClick={(e) => tryLocalSelect(cylinder.id, e)}
            onPointerEnter={() => { if (selectionMode === "select" || selectedTool === "boolean") setHoveredObjectId(cylinder.id); }}
            onPointerLeave={() => {
              if (selectionMode === "select" || selectedTool === "boolean") setHoveredObjectId(null);
              if (selectedTool === "mate" && hoveredFace?.objectId === cylinder.id) setHoveredFace(null);
            }}
            onPointerMove={(e) => { if (selectedTool === "mate") handleFaceHover(cylinder.id, e.point); }}
          />
        ))}
        {placedSpheres.map((sphere) => (
          <PlacedSphereMesh
            key={sphere.id}
            sphere={sphere}
            positionOverride={livePositions[sphere.id]}
            color={sphere.color}
            isSelected={sphere.id === selectedObjectId}
            isAnchor={sphere.id === anchorId}
            isMultiSelected={isMultiSelectActive && selectedObjectIds.includes(sphere.id) && sphere.id !== anchorId}
            isHovered={(selectionMode === "select" || selectedTool === "boolean") && sphere.id === hoveredObjectId}
            wireframe={wireframeEnabled}
            lockInfo={getLockInfo(sphere.id)}
            selectionInfo={getSelectionInfo(sphere.id)}
            onClick={(e) => tryLocalSelect(sphere.id, e)}
            onPointerEnter={() => { if (selectionMode === "select" || selectedTool === "boolean") setHoveredObjectId(sphere.id); }}
            onPointerLeave={() => {
              if (selectionMode === "select" || selectedTool === "boolean") setHoveredObjectId(null);
              if (selectedTool === "mate" && hoveredFace?.objectId === sphere.id) setHoveredFace(null);
            }}
            onPointerMove={(e) => { if (selectedTool === "mate") handleFaceHover(sphere.id, e.point); }}
          />
        ))}
        {placedCones.map((cone) => (
          <PlacedConeMesh
            key={cone.id}
            cone={cone}
            positionOverride={livePositions[cone.id]}
            color={cone.color}
            isSelected={cone.id === selectedObjectId}
            isAnchor={cone.id === anchorId}
            isMultiSelected={isMultiSelectActive && selectedObjectIds.includes(cone.id) && cone.id !== anchorId}
            isHovered={(selectionMode === "select" || selectedTool === "boolean") && cone.id === hoveredObjectId}
            wireframe={wireframeEnabled}
            lockInfo={getLockInfo(cone.id)}
            selectionInfo={getSelectionInfo(cone.id)}
            onClick={(e) => tryLocalSelect(cone.id, e)}
            onPointerEnter={() => { if (selectionMode === "select" || selectedTool === "boolean") setHoveredObjectId(cone.id); }}
            onPointerLeave={() => {
              if (selectionMode === "select" || selectedTool === "boolean") setHoveredObjectId(null);
              if (selectedTool === "mate" && hoveredFace?.objectId === cone.id) setHoveredFace(null);
            }}
            onPointerMove={(e) => { if (selectedTool === "mate") handleFaceHover(cone.id, e.point); }}
          />
        ))}
        {placedMeshes.map((mesh) => (
          <PlacedMeshComponent
            key={mesh.id}
            mesh={mesh}
            positionOverride={livePositions[mesh.id]}
            color={mesh.color}
            isSelected={mesh.id === selectedObjectId}
            isHovered={(selectionMode === "select" || selectedTool === "boolean") && mesh.id === hoveredObjectId}
            wireframe={wireframeEnabled}
            lockInfo={getLockInfo(mesh.id)}
            selectionInfo={getSelectionInfo(mesh.id)}
            onClick={(e) => tryLocalSelect(mesh.id, e)}
            onPointerEnter={() => { if (selectionMode === "select" || selectedTool === "boolean") setHoveredObjectId(mesh.id); }}
            onPointerLeave={() => { if (selectionMode === "select" || selectedTool === "boolean") setHoveredObjectId(null); }}
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
    selectedTool === "boolean" || selectedTool === "mate"
      ? "pointer"
      : selectedTool === "clone" || props.drawState.phase !== "idle" || selectionMode === "select"
      ? "crosshair"
      : "default";

  return (
    <div className="w-full h-full" style={{ cursor }}>
      <Canvas
        camera={{ position: [5, 5, 8], fov: 50 }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
