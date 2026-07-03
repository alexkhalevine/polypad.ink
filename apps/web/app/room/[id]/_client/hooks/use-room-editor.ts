import { useEffect, useMemo, useCallback, useRef } from "react";
import * as THREE from "three";
import { useBoxDraw } from "./use-box-draw";
import { useCylinderDraw } from "./use-cylinder-draw";
import { useSphereDraw } from "./use-sphere-draw";
import { useConeDraw } from "./use-cone-draw";
import { ToolType, PlacedBox, PlacedCylinder, PlacedSphere, PlacedCone, PlacedMesh, AxisSide } from "../types";
import { useRoomObjects } from "../queries/use-room-objects";
import { usePlaceObject } from "../queries/use-place-object";
import { useUpdateObjectColor } from "../queries/use-update-object-color";
import { useUpdateObjectPosition } from "../queries/use-update-object-position";
import { useUpdateObjectRotation } from "../queries/use-update-object-rotation";
import { useUpdateObjectDimensions, DimensionPatch } from "../queries/use-update-object-dimensions";
import { useDeleteObject } from "../queries/use-delete-object";
import { toWireBox, toWireCylinder, toWireSphere, toWireCone } from "../queries/wire-converters";
import { useRoomStore } from "../room-store";
import { computeAlignedPosition, computeDistributed, DistributeItem, aabbOf } from "../align-math";
import { computeMatePosition } from "../mate-math";
import { computeExtrusionBox } from "../extrude-math";
import { brushFrom, evaluateBooleanCentered } from "../csg-utils";
import { toWireMesh } from "../queries/wire-converters";
import { useErrorStore } from "@/app/error-store";
import { useRoomSocket } from "../realtime/use-room-socket";

type Socket = ReturnType<typeof useRoomSocket>;

export const useRoomEditor = (roomId: string, socket: Socket) => {
  const { emitCursor, requestSelection, requestLock, releaseLock, connectionState } = socket;

  const selectedTool = useRoomStore((s) => s.selectedTool);
  const selectionMode = useRoomStore((s) => s.selectionMode);
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const selectedObjectIds = useRoomStore((s) => s.selectedObjectIds);
  const anchorId = useRoomStore((s) => s.anchorId);
  const selectedColor = useRoomStore((s) => s.selectedColor);
  const setSelectedTool = useRoomStore((s) => s.setSelectedTool);
  const setSelectedColor = useRoomStore((s) => s.setSelectedColor);
  const setSelectionMode = useRoomStore((s) => s.setSelectionMode);
  const setSelectedObjectId = useRoomStore((s) => s.setSelectedObjectId);
  const resetEditorState = useRoomStore((s) => s.resetEditorState);
  const booleanTargetId = useRoomStore((s) => s.booleanTargetId);
  const booleanOperation = useRoomStore((s) => s.booleanOperation);
  const setBooleanTargetId = useRoomStore((s) => s.setBooleanTargetId);
  const setBooleanOperation = useRoomStore((s) => s.setBooleanOperation);
  const setClonePreviewPosition = useRoomStore((s) => s.setClonePreviewPosition);
  const setLivePosition = useRoomStore((s) => s.setLivePosition);
  const liveRotations = useRoomStore((s) => s.liveRotations);
  const setLiveRotation = useRoomStore((s) => s.setLiveRotation);
  const liveDimensions = useRoomStore((s) => s.liveDimensions);
  const setLiveDimension = useRoomStore((s) => s.setLiveDimension);
  const mateSource = useRoomStore((s) => s.mateSource);
  const mateTarget = useRoomStore((s) => s.mateTarget);
  const mateMode = useRoomStore((s) => s.mateMode);
  const mateOffset = useRoomStore((s) => s.mateOffset);
  const setMateMode = useRoomStore((s) => s.setMateMode);
  const setMateOffset = useRoomStore((s) => s.setMateOffset);
  const resetMate = useRoomStore((s) => s.resetMate);
  const extrude = useRoomStore((s) => s.extrude);
  const setExtrudeDepth = useRoomStore((s) => s.setExtrudeDepth);
  const resetExtrude = useRoomStore((s) => s.resetExtrude);
  const addError = useErrorStore((s) => s.addError);

  const objectLocks = useRoomStore((s) => s.objectLocks);
  const localUserId = useRoomStore((s) => s.localUserId);

  const { data: serverObjects, isError: isObjectsError } = useRoomObjects(roomId);
  const placeObject = usePlaceObject(roomId);
  const updateObjectColor = useUpdateObjectColor(roomId);
  const updateObjectPosition = useUpdateObjectPosition(roomId);
  const updateObjectRotation = useUpdateObjectRotation(roomId);
  const updateObjectDimensions = useUpdateObjectDimensions(roomId);
  const deleteObjectMutation = useDeleteObject(roomId);

  // Refs break the onPlace → draw hook → rollback cycle so onPlace can be stable.
  const boxDrawRef = useRef<ReturnType<typeof useBoxDraw> | null>(null);
  const cylinderDrawRef = useRef<ReturnType<typeof useCylinderDraw> | null>(null);
  const sphereDrawRef = useRef<ReturnType<typeof useSphereDraw> | null>(null);
  const coneDrawRef = useRef<ReturnType<typeof useConeDraw> | null>(null);

  const handleBoxPlace = useCallback((box: PlacedBox) => {
    placeObject.mutate(
      { type: "box", data: toWireBox(box) },
      { onSettled: () => boxDrawRef.current?.rollback(box.id) },
    );
  }, [placeObject]);

  const handleCylinderPlace = useCallback((cylinder: PlacedCylinder) => {
    placeObject.mutate(
      { type: "cylinder", data: toWireCylinder(cylinder) },
      { onSettled: () => cylinderDrawRef.current?.rollback(cylinder.id) },
    );
  }, [placeObject]);

  const handleSpherePlace = useCallback((sphere: PlacedSphere) => {
    placeObject.mutate(
      { type: "sphere", data: toWireSphere(sphere) },
      { onSettled: () => sphereDrawRef.current?.rollback(sphere.id) },
    );
  }, [placeObject]);

  const handleConePlace = useCallback((cone: PlacedCone) => {
    placeObject.mutate(
      { type: "cone", data: toWireCone(cone) },
      { onSettled: () => coneDrawRef.current?.rollback(cone.id) },
    );
  }, [placeObject]);

  const boxDraw = useBoxDraw({ onPlace: handleBoxPlace });
  const cylinderDraw = useCylinderDraw({ onPlace: handleCylinderPlace });
  const sphereDraw = useSphereDraw({ onPlace: handleSpherePlace });
  const coneDraw = useConeDraw({ onPlace: handleConePlace });

  boxDrawRef.current = boxDraw;
  cylinderDrawRef.current = cylinderDraw;
  sphereDrawRef.current = sphereDraw;
  coneDrawRef.current = coneDraw;

  const { cancelDraw: cancelBoxDraw } = boxDraw;
  const { cancelDraw: cancelCylinderDraw } = cylinderDraw;
  const { cancelDraw: cancelSphereDraw } = sphereDraw;
  const { cancelDraw: cancelConeDraw } = coneDraw;

  const cancelAll = useCallback(() => {
    cancelBoxDraw();
    cancelCylinderDraw();
    cancelSphereDraw();
    cancelConeDraw();
  }, [cancelBoxDraw, cancelCylinderDraw, cancelSphereDraw, cancelConeDraw]);

  const activeDraw = useMemo(() => {
    const map = { box: boxDraw, cylinder: cylinderDraw, sphere: sphereDraw, cone: coneDraw } as const;
    return selectedTool && selectedTool in map
      ? map[selectedTool as keyof typeof map]
      : null;
  }, [selectedTool, boxDraw, cylinderDraw, sphereDraw, coneDraw]);

  const placedBoxes = useMemo(
    () =>
      [...(serverObjects?.boxes ?? []), ...boxDraw.placedBoxes].map((b) => {
        const live = liveDimensions[b.id];
        const rot = liveRotations[b.id];
        const merged = live ? { ...b, ...live } : b;
        return rot ? { ...merged, rotation: rot } : merged;
      }),
    [serverObjects, boxDraw.placedBoxes, liveDimensions, liveRotations],
  );
  const placedCylinders = useMemo(
    () =>
      [...(serverObjects?.cylinders ?? []), ...cylinderDraw.placedCylinders].map((c) => {
        const live = liveDimensions[c.id];
        const rot = liveRotations[c.id];
        const merged = live ? { ...c, ...live } : c;
        return rot ? { ...merged, rotation: rot } : merged;
      }),
    [serverObjects, cylinderDraw.placedCylinders, liveDimensions, liveRotations],
  );
  const placedSpheres = useMemo(
    () =>
      [...(serverObjects?.spheres ?? []), ...sphereDraw.placedSpheres].map((s) => {
        const live = liveDimensions[s.id];
        const rot = liveRotations[s.id];
        const merged = live ? { ...s, ...live } : s;
        return rot ? { ...merged, rotation: rot } : merged;
      }),
    [serverObjects, sphereDraw.placedSpheres, liveDimensions, liveRotations],
  );
  const placedCones = useMemo(
    () =>
      [...(serverObjects?.cones ?? []), ...coneDraw.placedCones].map((c) => {
        const live = liveDimensions[c.id];
        const rot = liveRotations[c.id];
        const merged = live ? { ...c, ...live } : c;
        return rot ? { ...merged, rotation: rot } : merged;
      }),
    [serverObjects, coneDraw.placedCones, liveDimensions, liveRotations],
  );
  const placedMeshes = useMemo<PlacedMesh[]>(
    () =>
      (serverObjects?.meshes ?? []).map((m) => {
        const rot = liveRotations[m.id];
        return rot ? { ...m, rotation: rot } : m;
      }),
    [serverObjects, liveRotations],
  );

  const selectedObjectType = useMemo<"box" | "cylinder" | "sphere" | "cone" | "mesh" | null>(() => {
    if (!selectedObjectId) return null;
    if (placedBoxes.some((b) => b.id === selectedObjectId)) return "box";
    if (placedCylinders.some((c) => c.id === selectedObjectId)) return "cylinder";
    if (placedSpheres.some((s) => s.id === selectedObjectId)) return "sphere";
    if (placedCones.some((c) => c.id === selectedObjectId)) return "cone";
    if (placedMeshes.some((m) => m.id === selectedObjectId)) return "mesh";
    return null;
  }, [selectedObjectId, placedBoxes, placedCylinders, placedSpheres, placedCones, placedMeshes]);

  const selectedObject = useMemo<PlacedBox | PlacedCylinder | PlacedSphere | PlacedCone | PlacedMesh | undefined>(
    () =>
      selectedObjectId
        ? [...placedBoxes, ...placedCylinders, ...placedSpheres, ...placedCones, ...placedMeshes].find(
            (o) => o.id === selectedObjectId,
          )
        : undefined,
    [selectedObjectId, placedBoxes, placedCylinders, placedSpheres, placedCones, placedMeshes],
  );

  const selectedObjectCoords = selectedObject
    ? `X: ${selectedObject.position.x.toFixed(2)}, Y: ${selectedObject.position.y.toFixed(2)}, Z: ${selectedObject.position.z.toFixed(2)}`
    : null;

  const showSelectHelp = selectionMode === "select" && selectedObjectIds.length === 0;
  const showObjectSelected = selectionMode === "select" && !!selectedObjectId;
  const showMultiSelected = selectionMode === "select" && selectedObjectIds.length >= 2;

  const handleToolSelect = useCallback(
    (tool: ToolType) => {
      cancelAll();
      setSelectedTool(tool);
      setSelectionMode("draw");
      setSelectedObjectId(null);
      resetMate();
      resetExtrude();
    },
    [cancelAll, setSelectedTool, setSelectionMode, setSelectedObjectId, resetMate, resetExtrude],
  );

  const handleSelectClick = useCallback(() => {
    setSelectionMode(selectionMode === "select" ? "draw" : "select");
    setSelectedObjectId(null);
    setSelectedTool(null);
    cancelAll();
    resetMate();
    resetExtrude();
  }, [selectionMode, setSelectionMode, setSelectedObjectId, setSelectedTool, cancelAll, resetMate, resetExtrude]);

  const handleObjectMove = useCallback(
    (objectId: string, newPosition: THREE.Vector3, persist: boolean) => {
      const pos = { x: newPosition.x, y: newPosition.y, z: newPosition.z };
      if (persist) {
        updateObjectPosition.mutate({ objectId, position: pos });
      }
      setLivePosition(objectId, pos);
    },
    [updateObjectPosition, setLivePosition],
  );

  const handleObjectRotate = useCallback(
    (objectId: string, euler: { x: number; y: number; z: number }, persist: boolean) => {
      if (persist) {
        updateObjectRotation.mutate({ objectId, rotation: euler });
      }
      setLiveRotation(objectId, euler);
    },
    [updateObjectRotation, setLiveRotation],
  );

  const handleObjectScale = useCallback(
    (objectId: string, dimensions: DimensionPatch, persist: boolean) => {
      if (persist) {
        updateObjectDimensions.mutate({ objectId, dimensions });
      }
      for (const [field, value] of Object.entries(dimensions)) {
        setLiveDimension(objectId, field as "width" | "height" | "depth" | "radius", value as number);
      }
    },
    [updateObjectDimensions, setLiveDimension],
  );

  const handleRotationCommit = useCallback(
    (x: number, y: number, z: number) => {
      if (!selectedObjectId) return;
      updateObjectRotation.mutate({ objectId: selectedObjectId, rotation: { x, y, z } });
      setLiveRotation(selectedObjectId, { x, y, z });
    },
    [selectedObjectId, updateObjectRotation, setLiveRotation],
  );

  const onMouseUpColorPicked = useCallback(() => {
    if (selectedObjectId && selectedObject?.color !== selectedColor) {
      updateObjectColor.mutate({ objectId: selectedObjectId, color: selectedColor });
    }
  }, [selectedObjectId, selectedObject, selectedColor, updateObjectColor]);

  // Commit a specific color directly (used by inspector swatch presets, which
  // can't rely on the native color input's blur-then-commit flow).
  const handleColorCommit = useCallback(
    (color: string) => {
      setSelectedColor(color);
      if (selectedObjectId && selectedObject?.color !== color) {
        updateObjectColor.mutate({ objectId: selectedObjectId, color });
      }
    },
    [selectedObjectId, selectedObject, updateObjectColor, setSelectedColor],
  );

  const handleGroundPointerMove = useCallback(
    (point: THREE.Vector3) => {
      emitCursor({ x: point.x, y: point.y, z: point.z });
      activeDraw?.handleGroundPointerMove(point);
      if (selectedTool === "clone") {
        setClonePreviewPosition({ x: point.x, y: 0, z: point.z });
      }
    },
    [emitCursor, activeDraw, selectedTool, setClonePreviewPosition],
  );

  const handleDragStart = useCallback(
    async (objectId: string) => {
      const result = await requestLock(objectId);
      if (!result.ok) {
        addError("Object is locked by another user — try again in a moment.");
      }
      return result;
    },
    [requestLock, addError],
  );

  const handleDragEnd = useCallback(
    (objectId: string) => {
      releaseLock(objectId);
    },
    [releaseLock],
  );

  const handlePositionCommit = useCallback(
    (x: number, y: number, z: number) => {
      if (selectedObjectId) {
        updateObjectPosition.mutate({ objectId: selectedObjectId, position: { x, y, z } });
        setLivePosition(selectedObjectId, { x, y, z });
      }
    },
    [selectedObjectId, updateObjectPosition, setLivePosition],
  );

  const handleDimensionCommit = useCallback(
    (field: "width" | "height" | "depth" | "radius", value: number) => {
      if (!selectedObjectId) return;
      updateObjectDimensions.mutate({ objectId: selectedObjectId, dimensions: { [field]: value } });
      setLiveDimension(selectedObjectId, field, value);
    },
    [selectedObjectId, updateObjectDimensions, setLiveDimension],
  );

  const handleDeleteObject = useCallback(() => {
    if (!selectedObjectId) return;
    const lockHolder = objectLocks[selectedObjectId];
    if (lockHolder && lockHolder !== localUserId) {
      addError("Cannot delete: object is locked by another user.");
      return;
    }
    deleteObjectMutation.mutate(selectedObjectId, {
      onSuccess: () => resetEditorState(),
    });
  }, [selectedObjectId, objectLocks, localUserId, deleteObjectMutation, resetEditorState, addError]);

  // Align math only knows parametric primitives — meshes are skipped.
  const findShapeAndType = useCallback(
    (
      id: string,
    ): { shape: PlacedBox | PlacedCylinder | PlacedSphere | PlacedCone; type: "box" | "cylinder" | "sphere" | "cone" } | null => {
      const box = placedBoxes.find((b) => b.id === id);
      if (box) return { shape: box, type: "box" };
      const cyl = placedCylinders.find((c) => c.id === id);
      if (cyl) return { shape: cyl, type: "cylinder" };
      const sph = placedSpheres.find((s) => s.id === id);
      if (sph) return { shape: sph, type: "sphere" };
      const cone = placedCones.find((c) => c.id === id);
      if (cone) return { shape: cone, type: "cone" };
      return null;
    },
    [placedBoxes, placedCylinders, placedSpheres, placedCones],
  );

  // Moves every non-anchor selected object to the anchor on one axis. Fires
  // immediately per click — there's no pending "apply" step.
  const handleAlignAxis = useCallback(
    (axis: "x" | "y" | "z", side: AxisSide) => {
      if (!anchorId || selectedObjectIds.length < 2) return;
      const anchorEntry = findShapeAndType(anchorId);
      if (!anchorEntry) return;

      for (const id of selectedObjectIds) {
        if (id === anchorId) continue;
        const lockHolder = objectLocks[id];
        if (lockHolder && lockHolder !== localUserId) continue;
        const entry = findShapeAndType(id);
        if (!entry) continue;

        const newPos = computeAlignedPosition(
          entry.shape,
          entry.type,
          anchorEntry.shape,
          anchorEntry.type,
          axis === "x" ? side : null,
          axis === "y" ? side : null,
          axis === "z" ? side : null,
        );
        updateObjectPosition.mutate({ objectId: id, position: newPos });
        setLivePosition(id, newPos);
      }
    },
    [anchorId, selectedObjectIds, findShapeAndType, objectLocks, localUserId, updateObjectPosition, setLivePosition],
  );

  const handleDistribute = useCallback(
    (axis?: "x" | "y" | "z") => {
      if (selectedObjectIds.length < 3) return;
      const items: DistributeItem[] = [];
      for (const id of selectedObjectIds) {
        const lockHolder = objectLocks[id];
        if (lockHolder && lockHolder !== localUserId) continue;
        const entry = findShapeAndType(id);
        if (!entry) continue;
        items.push({ id, shape: entry.shape, type: entry.type });
      }
      const moved = computeDistributed(items, axis);
      for (const [id, pos] of Object.entries(moved)) {
        updateObjectPosition.mutate({ objectId: id, position: pos });
        setLivePosition(id, pos);
      }
    },
    [selectedObjectIds, objectLocks, localUserId, findShapeAndType, updateObjectPosition, setLivePosition],
  );

  const handleBooleanCancel = useCallback(() => {
    if (selectedObjectId) releaseLock(selectedObjectId);
    if (booleanTargetId) releaseLock(booleanTargetId);
    setBooleanTargetId(null);
    setBooleanOperation("ADDITION");
    setSelectedTool(null);
  }, [selectedObjectId, booleanTargetId, releaseLock, setBooleanTargetId, setBooleanOperation, setSelectedTool]);

  const handleBooleanApply = useCallback(async () => {
    if (!selectedObjectId || !booleanTargetId || !selectedObject || !selectedObjectType) return;

    const allObjects = [...placedBoxes, ...placedCylinders, ...placedSpheres, ...placedCones, ...placedMeshes];
    const targetObject = allObjects.find((o) => o.id === booleanTargetId);
    if (!targetObject) {
      setBooleanTargetId(null);
      return;
    }
    const targetType: "box" | "cylinder" | "sphere" | "cone" | "mesh" = placedBoxes.some(
      (b) => b.id === booleanTargetId,
    )
      ? "box"
      : placedCylinders.some((c) => c.id === booleanTargetId)
        ? "cylinder"
        : placedSpheres.some((s) => s.id === booleanTargetId)
          ? "sphere"
          : placedCones.some((c) => c.id === booleanTargetId)
            ? "cone"
            : "mesh";

    // Acquire locks on both inputs. If either fails, release whatever we got
    // and abort — the user can retry once the lock holder moves on.
    const lockSource = await requestLock(selectedObjectId);
    if (!lockSource.ok) {
      addError("Source object is locked by another user — try again.");
      return;
    }
    const lockTarget = await requestLock(booleanTargetId);
    if (!lockTarget.ok) {
      releaseLock(selectedObjectId);
      addError("Target object is locked by another user — try again.");
      return;
    }

    // Compute the CSG result, then place-then-delete so a place failure leaves
    // the originals intact (no orphan state on a partial failure).
    let result;
    try {
      const a = brushFrom(selectedObject, selectedObjectType);
      const b = brushFrom(targetObject, targetType);
      result = evaluateBooleanCentered(a, b, booleanOperation);
    } catch (err) {
      console.error("[handleBooleanApply] CSG failed:", err);
      releaseLock(selectedObjectId);
      releaseLock(booleanTargetId);
      addError("Boolean operation failed. Try a different shape combination.");
      return;
    }

    if (result.positions.length === 0) {
      releaseLock(selectedObjectId);
      releaseLock(booleanTargetId);
      addError("Boolean operation produced an empty result.");
      return;
    }

    const id = crypto.randomUUID();
    const wire = toWireMesh({
      id,
      position: result.centroid,
      rotation: { x: 0, y: 0, z: 0 },
      positions: result.positions,
      normals: result.normals,
      indices: result.indices,
      color: selectedObject.color ?? null,
    });

    placeObject.mutate(
      { type: "mesh", data: wire },
      {
        onSuccess: () => {
          // Originals can now be safely deleted. Use the mutation directly
          // (deleteObjectMutation accepts a string id).
          deleteObjectMutation.mutate(selectedObjectId);
          deleteObjectMutation.mutate(booleanTargetId);
          releaseLock(selectedObjectId);
          releaseLock(booleanTargetId);
          setSelectedObjectId(null);
          setBooleanTargetId(null);
          setSelectedTool(null);
        },
        onError: () => {
          releaseLock(selectedObjectId);
          releaseLock(booleanTargetId);
        },
      },
    );
  }, [
    selectedObjectId,
    booleanTargetId,
    selectedObject,
    selectedObjectType,
    booleanOperation,
    placedBoxes,
    placedCylinders,
    placedSpheres,
    placedCones,
    placedMeshes,
    requestLock,
    releaseLock,
    placeObject,
    deleteObjectMutation,
    setSelectedObjectId,
    setBooleanTargetId,
    setSelectedTool,
    addError,
  ]);

  const handleCloneApply = useCallback(
    (point: THREE.Vector3) => {
      if (!selectedObject || !selectedObjectType) return;
      const newPos = new THREE.Vector3(point.x, 0, point.z);
      const id = crypto.randomUUID();

      if (selectedObjectType === "box") {
        const src = selectedObject as PlacedBox;
        placeObject.mutate({
          type: "box",
          data: toWireBox({
            id,
            position: newPos,
            rotation: src.rotation,
            width: src.width,
            height: src.height,
            depth: src.depth,
            color: src.color,
          }),
        });
      } else if (selectedObjectType === "cylinder") {
        const src = selectedObject as PlacedCylinder;
        placeObject.mutate({
          type: "cylinder",
          data: toWireCylinder({
            id,
            position: newPos,
            rotation: src.rotation,
            radius: src.radius,
            height: src.height,
            color: src.color,
          }),
        });
      } else if (selectedObjectType === "sphere") {
        const src = selectedObject as PlacedSphere;
        placeObject.mutate({
          type: "sphere",
          data: toWireSphere({
            id,
            position: newPos,
            rotation: src.rotation,
            radius: src.radius,
            color: src.color,
          }),
        });
      } else if (selectedObjectType === "cone") {
        const src = selectedObject as PlacedCone;
        placeObject.mutate({
          type: "cone",
          data: toWireCone({
            id,
            position: newPos,
            rotation: src.rotation,
            radius: src.radius,
            height: src.height,
            color: src.color,
          }),
        });
      } else {
        // Mesh: copy buffers verbatim. The mesh geometry is already in world space
        // (see PlacedMesh comment in types.ts); position is the world-space offset
        // we want to apply on top, so we hand the click point straight through.
        const src = selectedObject as PlacedMesh;
        placeObject.mutate({
          type: "mesh",
          data: toWireMesh({
            id,
            position: newPos,
            rotation: src.rotation,
            positions: src.positions,
            normals: src.normals,
            indices: src.indices,
            color: src.color,
          }),
        });
      }

      setClonePreviewPosition(null);
      setSelectedTool(null);
    },
    [selectedObject, selectedObjectType, placeObject, setClonePreviewPosition, setSelectedTool],
  );

  const handleMateConfirm = useCallback(() => {
    if (!mateSource || !mateTarget) return;
    const sourceEntry = findShapeAndType(mateSource.objectId);
    const targetEntry = findShapeAndType(mateTarget.objectId);
    if (!sourceEntry || !targetEntry) {
      resetMate();
      return;
    }

    const lockHolder = objectLocks[mateSource.objectId];
    if (lockHolder && lockHolder !== localUserId) {
      addError("Cannot mate: source object is locked by another user.");
      resetMate();
      setSelectedTool(null);
      return;
    }

    const newPos = computeMatePosition(
      sourceEntry.shape,
      sourceEntry.type,
      mateSource.faceKey,
      targetEntry.shape,
      targetEntry.type,
      mateTarget.faceKey,
      mateMode,
      mateOffset,
    );

    updateObjectPosition.mutate({ objectId: mateSource.objectId, position: newPos });
    setLivePosition(mateSource.objectId, newPos);
    resetMate();
    setSelectedTool(null);
  }, [
    mateSource,
    mateTarget,
    mateMode,
    mateOffset,
    findShapeAndType,
    objectLocks,
    localUserId,
    updateObjectPosition,
    setLivePosition,
    resetMate,
    setSelectedTool,
    addError,
  ]);

  const handleMateCancel = useCallback(() => {
    resetMate();
    setSelectedTool(null);
  }, [resetMate, setSelectedTool]);

  // Commits the sketched rect + depth as a CSG op on the base box: depth > 0
  // unions an outward bump, depth < 0 subtracts an inward pocket. Same
  // place-mesh-then-delete-original flow as handleBooleanApply. Reads the
  // extrude state fresh from the store because the depth-capture click sets
  // the final depth and commits within the same event tick.
  const handleExtrudeCommit = useCallback(async () => {
    const ex = useRoomStore.getState().extrude;
    if (ex.phase !== "depth" || !ex.face || !ex.rectStart || !ex.rectEnd) return;

    const baseBox = placedBoxes.find((b) => b.id === ex.face!.objectId);
    if (!baseBox) {
      resetExtrude();
      setSelectedTool(null);
      return;
    }

    const tool = computeExtrusionBox(aabbOf(baseBox, "box"), ex.face.faceKey, ex.rectStart, ex.rectEnd, ex.depth);
    if (!tool) {
      addError("Extrusion is too small — drag further before confirming.");
      return;
    }

    const lock = await requestLock(baseBox.id);
    if (!lock.ok) {
      addError("Object is locked by another user — try again.");
      return;
    }

    let result;
    try {
      const toolBox: PlacedBox = {
        id: "extrude-tool",
        position: new THREE.Vector3(tool.position.x, tool.position.y, tool.position.z),
        rotation: { x: 0, y: 0, z: 0 },
        width: tool.width,
        height: tool.height,
        depth: tool.depth,
        color: null,
      };
      const base = brushFrom(baseBox, "box");
      const cutter = brushFrom(toolBox, "box");
      result = evaluateBooleanCentered(base, cutter, ex.depth > 0 ? "ADDITION" : "SUBTRACTION");
    } catch (err) {
      console.error("[handleExtrudeCommit] CSG failed:", err);
      releaseLock(baseBox.id);
      addError("Extrude failed. Try a different rectangle or depth.");
      return;
    }

    if (result.positions.length === 0) {
      releaseLock(baseBox.id);
      addError("Extrude produced an empty result.");
      return;
    }

    const id = crypto.randomUUID();
    const wire = toWireMesh({
      id,
      position: result.centroid,
      rotation: { x: 0, y: 0, z: 0 },
      positions: result.positions,
      normals: result.normals,
      indices: result.indices,
      color: baseBox.color ?? null,
    });

    placeObject.mutate(
      { type: "mesh", data: wire },
      {
        onSuccess: () => {
          deleteObjectMutation.mutate(baseBox.id);
          releaseLock(baseBox.id);
          setSelectedObjectId(null);
          resetExtrude();
          setSelectedTool(null);
        },
        onError: () => {
          releaseLock(baseBox.id);
        },
      },
    );
  }, [
    placedBoxes,
    requestLock,
    releaseLock,
    placeObject,
    deleteObjectMutation,
    setSelectedObjectId,
    resetExtrude,
    setSelectedTool,
    addError,
  ]);

  const handleExtrudeCancel = useCallback(() => {
    resetExtrude();
    setSelectedTool(null);
  }, [resetExtrude, setSelectedTool]);

  const handleGroundClick = useCallback(
    (point: THREE.Vector3) => {
      if (selectedTool === "clone") {
        handleCloneApply(point);
        return;
      }
      if (selectedTool === "mate") {
        if (mateSource && mateTarget) handleMateConfirm();
        return;
      }
      activeDraw?.handleGroundClick(point);
    },
    [selectedTool, handleCloneApply, activeDraw, mateSource, mateTarget, handleMateConfirm],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Escape") {
        cancelAll();
        resetEditorState();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedObjectId) {
        e.preventDefault();
        handleDeleteObject();
      }

      if (e.key === "s" || e.key === "S") handleSelectClick();
      if ((e.key === "m" || e.key === "M") && selectedObjectId) setSelectedTool("move");
      if ((e.key === "r" || e.key === "R") && selectedObjectId) setSelectedTool("rotate");
      if ((e.key === "e" || e.key === "E") && selectedObjectId) setSelectedTool("scale");
      if ((e.key === "b" || e.key === "B") && selectedObjectId) setSelectedTool("boolean");
      if ((e.key === "c" || e.key === "C") && selectedObjectId) setSelectedTool("clone");

      if (selectedTool === "boolean") {
        if (e.key === "Enter") {
          e.preventDefault();
          handleBooleanApply();
        }
        if (e.key === "1") setBooleanOperation("ADDITION");
        if (e.key === "2") setBooleanOperation("SUBTRACTION");
        if (e.key === "3") setBooleanOperation("REVERSE_SUBTRACTION");
        if (e.key === "4") setBooleanOperation("DIFFERENCE");
        if (e.key === "5") setBooleanOperation("INTERSECTION");
      }

      if (selectedTool === "mate" && e.key === "Enter") {
        e.preventDefault();
        handleMateConfirm();
      }

      if (selectedTool === "extrude" && e.key === "Enter") {
        e.preventDefault();
        handleExtrudeCommit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelAll, resetEditorState, selectedObjectId, handleDeleteObject, selectedTool, handleSelectClick, setSelectedTool, handleBooleanApply, setBooleanOperation, handleMateConfirm, handleExtrudeCommit]);

  useEffect(() => {
    if (isObjectsError) {
      addError("Could not load 3D objects. Try refreshing the page.");
    }
  }, [isObjectsError, addError]);

  useEffect(() => {
    if (connectionState === "full") {
      addError("This room is full (max 5 users).");
    }
  }, [connectionState, addError]);

  const priorSelectionRef = useRef<string | null>(null);
  useEffect(() => {
    const target = selectedObjectId;
    let cancelled = false;
    requestSelection(target).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        priorSelectionRef.current = target;
        return;
      }
      // Race-loss safety net: another user grabbed the selection first.
      // Roll local state back to the last-confirmed selection.
      const fallback = priorSelectionRef.current;
      const remoteUsers = useRoomStore.getState().remoteUsers;
      const heldBy = result.selectedBy;
      const displayName = heldBy ? remoteUsers[heldBy]?.displayName ?? heldBy : "another user";
      addError(`Selected by ${displayName}.`);
      setSelectedObjectId(fallback);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedObjectId, requestSelection, setSelectedObjectId, addError]);

  return {
    activeDraw,
    placedBoxes,
    placedCylinders,
    placedSpheres,
    placedCones,
    placedMeshes,
    selectedObject,
    selectedObjectType,
    selectedTool,
    showSelectHelp,
    showObjectSelected,
    showMultiSelected,
    selectedObjectCoords,
    isPending: updateObjectColor.isPending || placeObject.isPending,
    handleToolSelect,
    handleSelectClick,
    handleObjectMove,
    handleObjectRotate,
    handleObjectScale,
    handleRotationCommit,
    onMouseUpColorPicked,
    handleColorCommit,
    handleGroundPointerMove,
    handleGroundClick,
    handleDragStart,
    handleDragEnd,
    handlePositionCommit,
    handleDimensionCommit,
    handleDeleteObject,
    selectedObjectIds,
    anchorId,
    handleAlignAxis,
    handleDistribute,
    booleanTargetId,
    handleBooleanApply,
    handleBooleanCancel,
    mateSource,
    mateTarget,
    mateMode,
    mateOffset,
    setMateMode,
    setMateOffset,
    handleMateConfirm,
    handleMateCancel,
    extrude,
    setExtrudeDepth,
    handleExtrudeCommit,
    handleExtrudeCancel,
  };
};
