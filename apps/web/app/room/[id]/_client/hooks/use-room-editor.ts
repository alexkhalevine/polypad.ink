import { useEffect, useMemo, useCallback, useRef } from "react";
import * as THREE from "three";
import { useBoxDraw } from "./use-box-draw";
import { useCylinderDraw } from "./use-cylinder-draw";
import { useSphereDraw } from "./use-sphere-draw";
import { ToolType, PlacedBox, PlacedCylinder, PlacedSphere, PlacedMesh, ExtrudeFace } from "../types";
import type { ExtrudeResult } from "../extrude-utils";
import { useQueryClient } from "@tanstack/react-query";
import { useRoomObjects, type RoomObjects } from "../queries/use-room-objects";
import { roomKeys } from "../queries/query-keys";
import { fromWireMesh } from "../queries/wire-converters";
import { usePlaceObject } from "../queries/use-place-object";
import { useUpdateObjectColor } from "../queries/use-update-object-color";
import { useUpdateObjectPosition } from "../queries/use-update-object-position";
import { useUpdateObjectDimensions } from "../queries/use-update-object-dimensions";
import { useDeleteObject } from "../queries/use-delete-object";
import { toWireBox, toWireCylinder, toWireSphere } from "../queries/wire-converters";
import { useRoomStore } from "../room-store";
import { computeAlignedPosition } from "../align-math";
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
  const selectedColor = useRoomStore((s) => s.selectedColor);
  const setSelectedTool = useRoomStore((s) => s.setSelectedTool);
  const setSelectionMode = useRoomStore((s) => s.setSelectionMode);
  const setSelectedObjectId = useRoomStore((s) => s.setSelectedObjectId);
  const resetEditorState = useRoomStore((s) => s.resetEditorState);
  const alignTargetId = useRoomStore((s) => s.alignTargetId);
  const setAlignTargetId = useRoomStore((s) => s.setAlignTargetId);
  const alignXSide = useRoomStore((s) => s.alignXSide);
  const alignYSide = useRoomStore((s) => s.alignYSide);
  const alignZSide = useRoomStore((s) => s.alignZSide);
  const setAlignXSide = useRoomStore((s) => s.setAlignXSide);
  const setAlignYSide = useRoomStore((s) => s.setAlignYSide);
  const setAlignZSide = useRoomStore((s) => s.setAlignZSide);
  const booleanTargetId = useRoomStore((s) => s.booleanTargetId);
  const booleanOperation = useRoomStore((s) => s.booleanOperation);
  const setBooleanTargetId = useRoomStore((s) => s.setBooleanTargetId);
  const setBooleanOperation = useRoomStore((s) => s.setBooleanOperation);
  const setClonePreviewPosition = useRoomStore((s) => s.setClonePreviewPosition);
  const setLivePosition = useRoomStore((s) => s.setLivePosition);
  const liveDimensions = useRoomStore((s) => s.liveDimensions);
  const setLiveDimension = useRoomStore((s) => s.setLiveDimension);
  const setExtrudeFace = useRoomStore((s) => s.setExtrudeFace);
  const setSelectedFace = useRoomStore((s) => s.setSelectedFace);
  const addError = useErrorStore((s) => s.addError);

  const objectLocks = useRoomStore((s) => s.objectLocks);
  const localUserId = useRoomStore((s) => s.localUserId);

  const queryClient = useQueryClient();
  const { data: serverObjects, isError: isObjectsError } = useRoomObjects(roomId);
  const placeObject = usePlaceObject(roomId);
  const updateObjectColor = useUpdateObjectColor(roomId);
  const updateObjectPosition = useUpdateObjectPosition(roomId);
  const updateObjectDimensions = useUpdateObjectDimensions(roomId);
  const deleteObjectMutation = useDeleteObject(roomId);

  // Refs break the onPlace → draw hook → rollback cycle so onPlace can be stable.
  const boxDrawRef = useRef<ReturnType<typeof useBoxDraw> | null>(null);
  const cylinderDrawRef = useRef<ReturnType<typeof useCylinderDraw> | null>(null);
  const sphereDrawRef = useRef<ReturnType<typeof useSphereDraw> | null>(null);

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

  const boxDraw = useBoxDraw({ onPlace: handleBoxPlace });
  const cylinderDraw = useCylinderDraw({ onPlace: handleCylinderPlace });
  const sphereDraw = useSphereDraw({ onPlace: handleSpherePlace });

  boxDrawRef.current = boxDraw;
  cylinderDrawRef.current = cylinderDraw;
  sphereDrawRef.current = sphereDraw;

  const { cancelDraw: cancelBoxDraw } = boxDraw;
  const { cancelDraw: cancelCylinderDraw } = cylinderDraw;
  const { cancelDraw: cancelSphereDraw } = sphereDraw;

  const cancelAll = useCallback(() => {
    cancelBoxDraw();
    cancelCylinderDraw();
    cancelSphereDraw();
  }, [cancelBoxDraw, cancelCylinderDraw, cancelSphereDraw]);

  const activeDraw = useMemo(() => {
    const map = { box: boxDraw, cylinder: cylinderDraw, sphere: sphereDraw } as const;
    return selectedTool && selectedTool in map
      ? map[selectedTool as keyof typeof map]
      : null;
  }, [selectedTool, boxDraw, cylinderDraw, sphereDraw]);

  const placedBoxes = useMemo(
    () =>
      [...(serverObjects?.boxes ?? []), ...boxDraw.placedBoxes].map((b) => {
        const live = liveDimensions[b.id];
        return live ? { ...b, ...live } : b;
      }),
    [serverObjects, boxDraw.placedBoxes, liveDimensions],
  );
  const placedCylinders = useMemo(
    () =>
      [...(serverObjects?.cylinders ?? []), ...cylinderDraw.placedCylinders].map((c) => {
        const live = liveDimensions[c.id];
        return live ? { ...c, ...live } : c;
      }),
    [serverObjects, cylinderDraw.placedCylinders, liveDimensions],
  );
  const placedSpheres = useMemo(
    () =>
      [...(serverObjects?.spheres ?? []), ...sphereDraw.placedSpheres].map((s) => {
        const live = liveDimensions[s.id];
        return live ? { ...s, ...live } : s;
      }),
    [serverObjects, sphereDraw.placedSpheres, liveDimensions],
  );
  const placedMeshes = useMemo<PlacedMesh[]>(
    () => serverObjects?.meshes ?? [],
    [serverObjects],
  );

  const selectedObjectType = useMemo<"box" | "cylinder" | "sphere" | "mesh" | null>(() => {
    if (!selectedObjectId) return null;
    if (placedBoxes.some((b) => b.id === selectedObjectId)) return "box";
    if (placedCylinders.some((c) => c.id === selectedObjectId)) return "cylinder";
    if (placedSpheres.some((s) => s.id === selectedObjectId)) return "sphere";
    if (placedMeshes.some((m) => m.id === selectedObjectId)) return "mesh";
    return null;
  }, [selectedObjectId, placedBoxes, placedCylinders, placedSpheres, placedMeshes]);

  const selectedObject = useMemo<PlacedBox | PlacedCylinder | PlacedSphere | PlacedMesh | undefined>(
    () =>
      selectedObjectId
        ? [...placedBoxes, ...placedCylinders, ...placedSpheres, ...placedMeshes].find(
            (o) => o.id === selectedObjectId,
          )
        : undefined,
    [selectedObjectId, placedBoxes, placedCylinders, placedSpheres, placedMeshes],
  );

  const selectedObjectCoords = selectedObject
    ? `X: ${selectedObject.position.x.toFixed(2)}, Y: ${selectedObject.position.y.toFixed(2)}, Z: ${selectedObject.position.z.toFixed(2)}`
    : null;

  const showSelectHelp = selectionMode === "select" && !selectedObjectId;
  const showObjectSelected = selectionMode === "select" && !!selectedObjectId;

  // Drop the picked extrude face and selected face when a sub-tool is left (tool
  // switch / deselect / Esc). These are client-only visual state, nothing to undo.
  const clearExtrudeState = useCallback(() => {
    setExtrudeFace(null);
    setSelectedFace(null);
  }, [setExtrudeFace, setSelectedFace]);

  const handleFaceSelect = useCallback(
    (face: ExtrudeFace) => {
      if (!selectedObjectId) return;
      setSelectedFace({ objectId: selectedObjectId, ...face });
    },
    [selectedObjectId, setSelectedFace],
  );

  const handleToolSelect = useCallback(
    (tool: ToolType) => {
      cancelAll();
      clearExtrudeState();
      setSelectedTool(tool);
      setSelectionMode("draw");
      setSelectedObjectId(null);
    },
    [cancelAll, clearExtrudeState, setSelectedTool, setSelectionMode, setSelectedObjectId],
  );

  const handleSelectClick = useCallback(() => {
    setSelectionMode(selectionMode === "select" ? "draw" : "select");
    setSelectedObjectId(null);
    setSelectedTool(null);
    cancelAll();
    clearExtrudeState();
  }, [selectionMode, setSelectionMode, setSelectedObjectId, setSelectedTool, cancelAll, clearExtrudeState]);

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

  const onMouseUpColorPicked = useCallback(() => {
    if (selectedObjectId && selectedObject?.color !== selectedColor) {
      updateObjectColor.mutate({ objectId: selectedObjectId, color: selectedColor });
    }
  }, [selectedObjectId, selectedObject, selectedColor, updateObjectColor]);

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

  const handleExtrudeFaceSelect = useCallback(
    (face: ExtrudeFace) => {
      setExtrudeFace(face);
    },
    [setExtrudeFace],
  );

  // Real mesh extrude: the overlay produced new geometry. Persist it as a fresh
  // mesh and delete the original — same place-then-delete pattern as boolean apply.
  // The new mesh stays selected but we exit the extrude tool so it behaves like a
  // normal selection again (clicks select/move rather than re-picking a face). With
  // face-select on, clicking a face still chains another extrude.
  const handleExtrudeCommit = useCallback(
    async (result: ExtrudeResult) => {
      if (!selectedObjectId || !selectedObject) return;
      const originalId = selectedObjectId;
      const color = selectedObject.color ?? null;

      const lock = await requestLock(originalId);
      if (!lock.ok) {
        addError("Object is locked by another user — try again in a moment.");
        return;
      }

      const newId = crypto.randomUUID();
      const wire = toWireMesh({
        id: newId,
        position: result.centroid,
        positions: result.positions,
        normals: result.normals,
        indices: result.indices,
        edges: result.edges,
        color,
      });

      placeObject.mutate(
        { type: "mesh", data: wire },
        {
          onSuccess: (res) => {
            // The server assigns its own id (see withServerId) and returns it.
            const serverId = res.status === 201 ? res.data.id : null;
            // Reconcile the object cache deterministically: drop the original and
            // insert the result. Unlike box/cylinder/sphere placement (which has an
            // optimistic bridge via the draw hooks), the extrude swap otherwise
            // relies purely on socket/refetch ordering, which can race and leave the
            // original lingering or the result missing/mis-shown until a reload.
            if (serverId) {
              queryClient.setQueryData<RoomObjects>(roomKeys.objects(roomId), (prev) => {
                if (!prev) return prev;
                const meshes = prev.meshes.filter(
                  (m) => m.id !== originalId && m.id !== serverId,
                );
                meshes.push(fromWireMesh({ ...wire, id: serverId }));
                return {
                  boxes: prev.boxes.filter((b) => b.id !== originalId),
                  cylinders: prev.cylinders.filter((c) => c.id !== originalId),
                  spheres: prev.spheres.filter((s) => s.id !== originalId),
                  meshes,
                };
              });
            }
            deleteObjectMutation.mutate(originalId);
            releaseLock(originalId);
            setExtrudeFace(null);
            setSelectedTool(null);
            // Select the server id — selecting the client-generated id would match
            // no rendered object, leaving the result dimmed by focus mode until Esc.
            setSelectedObjectId(serverId);
          },
          onError: () => releaseLock(originalId),
        },
      );
    },
    [
      selectedObjectId,
      selectedObject,
      requestLock,
      releaseLock,
      placeObject,
      deleteObjectMutation,
      setExtrudeFace,
      setSelectedTool,
      setSelectedObjectId,
      addError,
      queryClient,
      roomId,
    ],
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

  const handleAlignApply = useCallback(() => {
    if (!selectedObjectId || !alignTargetId || !selectedObject || !selectedObjectType) return;
    // Align math only knows parametric primitives — mesh source/target is not supported.
    if (selectedObjectType === "mesh") return;

    const lockHolder = objectLocks[selectedObjectId];
    if (lockHolder && lockHolder !== localUserId) {
      addError("Cannot align: object is locked by another user.");
      setAlignTargetId(null);
      setSelectedTool(null);
      return;
    }

    const parametric = [...placedBoxes, ...placedCylinders, ...placedSpheres];
    const targetObject = parametric.find((o) => o.id === alignTargetId);
    if (!targetObject) {
      setAlignTargetId(null);
      return;
    }

    const targetType: "box" | "cylinder" | "sphere" = placedBoxes.some((b) => b.id === alignTargetId)
      ? "box"
      : placedCylinders.some((c) => c.id === alignTargetId)
        ? "cylinder"
        : "sphere";

    const newPos = computeAlignedPosition(
      selectedObject as PlacedBox | PlacedCylinder | PlacedSphere,
      selectedObjectType,
      targetObject,
      targetType,
      alignXSide,
      alignYSide,
      alignZSide,
    );

    updateObjectPosition.mutate({ objectId: selectedObjectId, position: newPos });
    setLivePosition(selectedObjectId, newPos);
    setAlignTargetId(null);
    setSelectedTool(null);
  }, [
    selectedObjectId,
    alignTargetId,
    alignXSide,
    alignYSide,
    alignZSide,
    selectedObject,
    selectedObjectType,
    objectLocks,
    localUserId,
    placedBoxes,
    placedCylinders,
    placedSpheres,
    updateObjectPosition,
    setLivePosition,
    setAlignTargetId,
    setSelectedTool,
    addError,
  ]);

  const handleAlignCancel = useCallback(() => {
    setAlignTargetId(null);
    setSelectedTool(null);
    setAlignXSide("center");
    setAlignYSide(null);
    setAlignZSide("center");
  }, [setAlignTargetId, setSelectedTool, setAlignXSide, setAlignYSide, setAlignZSide]);

  const handleBooleanCancel = useCallback(() => {
    if (selectedObjectId) releaseLock(selectedObjectId);
    if (booleanTargetId) releaseLock(booleanTargetId);
    setBooleanTargetId(null);
    setBooleanOperation("ADDITION");
    setSelectedTool(null);
  }, [selectedObjectId, booleanTargetId, releaseLock, setBooleanTargetId, setBooleanOperation, setSelectedTool]);

  const handleBooleanApply = useCallback(async () => {
    if (!selectedObjectId || !booleanTargetId || !selectedObject || !selectedObjectType) return;

    const allObjects = [...placedBoxes, ...placedCylinders, ...placedSpheres, ...placedMeshes];
    const targetObject = allObjects.find((o) => o.id === booleanTargetId);
    if (!targetObject) {
      setBooleanTargetId(null);
      return;
    }
    const targetType: "box" | "cylinder" | "sphere" | "mesh" = placedBoxes.some(
      (b) => b.id === booleanTargetId,
    )
      ? "box"
      : placedCylinders.some((c) => c.id === booleanTargetId)
        ? "cylinder"
        : placedSpheres.some((s) => s.id === booleanTargetId)
          ? "sphere"
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
      positions: result.positions,
      normals: result.normals,
      indices: result.indices,
      edges: null,
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
            radius: src.radius,
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
            positions: src.positions,
            normals: src.normals,
            indices: src.indices,
            edges: src.edges,
            color: src.color,
          }),
        });
      }

      setClonePreviewPosition(null);
      setSelectedTool(null);
    },
    [selectedObject, selectedObjectType, placeObject, setClonePreviewPosition, setSelectedTool],
  );

  const handleGroundClick = useCallback(
    (point: THREE.Vector3) => {
      if (selectedTool === "clone") {
        handleCloneApply(point);
        return;
      }
      activeDraw?.handleGroundClick(point);
    },
    [selectedTool, handleCloneApply, activeDraw],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only suppress shortcuts while a *text-entry* field is focused (typing would
      // otherwise trigger them). Checkbox/toggle inputs keep focus after a click but
      // must not swallow Escape or other shortcuts.
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      const inputType = tag === "INPUT" ? (el as HTMLInputElement).type : "";
      const isTextEntry =
        tag === "TEXTAREA" ||
        (tag === "INPUT" &&
          inputType !== "checkbox" &&
          inputType !== "radio" &&
          inputType !== "range" &&
          inputType !== "color");
      if (isTextEntry) return;

      if (e.key === "Escape") {
        const wasSelecting = selectionMode === "select";
        cancelAll();
        clearExtrudeState();
        resetEditorState();
        // resetEditorState drops back to "draw" mode; if the user was selecting,
        // keep them in select mode so they can immediately pick another object
        // (others are un-selectable only until the current one is deselected).
        if (wasSelecting) setSelectionMode("select");
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedObjectId) {
        e.preventDefault();
        handleDeleteObject();
      }

      if (e.key === "s" || e.key === "S") handleSelectClick();
      if ((e.key === "m" || e.key === "M") && selectedObjectId) setSelectedTool("move");
      if ((e.key === "a" || e.key === "A") && selectedObjectId) setSelectedTool("align");
      if ((e.key === "b" || e.key === "B") && selectedObjectId) setSelectedTool("boolean");
      if ((e.key === "c" || e.key === "C") && selectedObjectId) setSelectedTool("clone");
      if (
        (e.key === "e" || e.key === "E") &&
        selectedObjectId &&
        (selectedObjectType === "box" ||
          selectedObjectType === "cylinder" ||
          selectedObjectType === "mesh")
      )
        setSelectedTool("extrude");
      if ((e.key === "f" || e.key === "F") && selectedObjectId && selectedObjectType === "mesh")
        setSelectedTool("face");

      if (selectedTool === "align") {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAlignApply();
        }
        if (e.key === "x") setAlignXSide(useRoomStore.getState().alignXSide === null ? "center" : null);
        if (e.key === "y") setAlignYSide(useRoomStore.getState().alignYSide === null ? "center" : null);
        if (e.key === "z") setAlignZSide(useRoomStore.getState().alignZSide === null ? "center" : null);
      }

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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelAll, clearExtrudeState, resetEditorState, selectionMode, setSelectionMode, selectedObjectId, selectedObjectType, handleDeleteObject, selectedTool, handleAlignApply, setAlignXSide, setAlignYSide, setAlignZSide, handleSelectClick, setSelectedTool, handleBooleanApply, setBooleanOperation]);

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
    placedMeshes,
    selectedObject,
    selectedObjectType,
    selectedTool,
    showSelectHelp,
    showObjectSelected,
    selectedObjectCoords,
    isPending: updateObjectColor.isPending || placeObject.isPending,
    handleToolSelect,
    handleSelectClick,
    handleObjectMove,
    onMouseUpColorPicked,
    handleGroundPointerMove,
    handleGroundClick,
    handleDragStart,
    handleDragEnd,
    handlePositionCommit,
    handleDimensionCommit,
    handleExtrudeFaceSelect,
    handleExtrudeCommit,
    handleFaceSelect,
    handleDeleteObject,
    alignTargetId,
    handleAlignApply,
    handleAlignCancel,
    booleanTargetId,
    handleBooleanApply,
    handleBooleanCancel,
  };
};
