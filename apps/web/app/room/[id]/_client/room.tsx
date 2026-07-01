"use client";

import { useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Scene } from "./scene";
import { getHelpText } from "@/app/utils";
import { useRoomSocket } from "./realtime/use-room-socket";
import { useRoomEditor } from "./hooks/use-room-editor";
import { useFullscreen } from "./hooks/use-fullscreen";
import { ContextMenu } from "./context-menu";
import { ExportModal } from "./export-modal";
import { BooleanPanel } from "./boolean-panel";
import { Inspector } from "./inspector";
import { ShortcutsHelp } from "./shortcuts-help";
import { TopBar } from "./top-bar";
import { ToolRail } from "./tool-rail";
import { ObjectToolbar } from "./object-toolbar";
import { AlignBar } from "./align-bar";
import { MatePopover } from "./mate-popover";
import { ShapeDock } from "./shape-dock";
import { StatusBar } from "./status-bar";
import { useRoomStore } from "./room-store";

const idleState = { phase: "idle" as const };
const noop = () => {};

export const Room = ({ inviteCode }: { inviteCode: string }) => {
  const params = useParams();
  const id = params.id;
  if (typeof id !== "string") throw new Error("invalid room id");

  const socket = useRoomSocket(id, inviteCode);
  const editor = useRoomEditor(id, socket);
  const setSelectedColor = useRoomStore((s) => s.setSelectedColor);

  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(rootRef);

  const exportModalRef = useRef<HTMLDialogElement>(null);
  const hasObjects =
    editor.placedBoxes.length +
      editor.placedCylinders.length +
      editor.placedSpheres.length +
      editor.placedCones.length +
      editor.placedMeshes.length >
    0;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const openContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const helpText =
    editor.selectedTool || editor.showSelectHelp || editor.showObjectSelected || editor.showMultiSelected
      ? getHelpText({
          phase: editor.activeDraw?.drawState.phase,
          showSelectHelp: editor.showSelectHelp,
          showObjectSelected: editor.showObjectSelected,
          showMultiSelected: editor.showMultiSelected,
          selectedCount: editor.selectedObjectIds.length,
          selectedObjectCoords: editor.selectedObjectCoords,
          selectedTool: editor.selectedTool,
        })
      : null;

  const booleanTarget = editor.booleanTargetId
    ? [
        ...editor.placedBoxes,
        ...editor.placedCylinders,
        ...editor.placedSpheres,
        ...editor.placedCones,
        ...editor.placedMeshes,
      ].find((o) => o.id === editor.booleanTargetId) ?? null
    : null;
  const booleanTargetKind = editor.booleanTargetId
    ? editor.placedBoxes.some((b) => b.id === editor.booleanTargetId)
      ? "box"
      : editor.placedCylinders.some((c) => c.id === editor.booleanTargetId)
        ? "cylinder"
        : editor.placedSpheres.some((s) => s.id === editor.booleanTargetId)
          ? "sphere"
          : editor.placedCones.some((c) => c.id === editor.booleanTargetId)
            ? "cone"
            : editor.placedMeshes.some((m) => m.id === editor.booleanTargetId)
              ? "mesh"
              : null
    : null;

  return (
    <div ref={rootRef} className="relative h-full w-full flex-1 overflow-hidden">
      {/* Canvas + backdrop glow */}
      <div className="pp-canvas-glow absolute inset-0" />
      <div
        className="absolute inset-0"
        onPointerLeave={() => socket.emitCursor(null)}
        onContextMenu={openContextMenu}
      >
        <Scene
          roomId={id}
          drawState={editor.activeDraw?.drawState ?? idleState}
          placedBoxes={editor.placedBoxes}
          placedCylinders={editor.placedCylinders}
          placedSpheres={editor.placedSpheres}
          placedCones={editor.placedCones}
          placedMeshes={editor.placedMeshes}
          selectedObject={editor.selectedObject ?? null}
          selectedObjectType={editor.selectedObjectType}
          onGroundStartDraw={editor.activeDraw?.handleGroundStartDraw ?? noop}
          onGroundPointerMove={editor.handleGroundPointerMove}
          onGroundClick={editor.handleGroundClick}
          onHeightPointerMove={editor.activeDraw?.handleHeightPointerMove ?? noop}
          onHeightClick={editor.activeDraw?.handleHeightClick ?? noop}
          onObjectMove={editor.handleObjectMove}
          onObjectRotate={editor.handleObjectRotate}
          onObjectScale={editor.handleObjectScale}
          onDragStart={editor.handleDragStart}
          onDragEnd={editor.handleDragEnd}
          onDimensionCommit={editor.handleDimensionCommit}
        />
      </div>

      {/* Docked chrome */}
      <TopBar roomName={id} onExport={() => exportModalRef.current?.showModal()} />
      <ToolRail onSelectClick={editor.handleSelectClick} onMateClick={() => editor.handleToolSelect("mate")} />
      <ObjectToolbar onDelete={editor.handleDeleteObject} />
      <ShapeDock onToolSelect={editor.handleToolSelect} />
      <StatusBar
        selectedObjectCoords={editor.selectedObjectCoords}
        selectedCount={editor.selectedObjectIds.length}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
      <ShortcutsHelp />

      <Inspector
        selectedObject={editor.selectedObject ?? null}
        selectedObjectType={editor.selectedObjectType}
        currentColor={editor.selectedObject?.color ?? "#3f7fe8"}
        onPositionCommit={editor.handlePositionCommit}
        onRotationCommit={editor.handleRotationCommit}
        onDimensionCommit={editor.handleDimensionCommit}
        onColorChange={setSelectedColor}
        onColorBlur={editor.onMouseUpColorPicked}
        onSwatchCommit={editor.handleColorCommit}
      >
        {editor.selectedTool === "boolean" &&
          editor.selectedObject &&
          editor.selectedObjectType && (
            <div className="mt-5 border-t border-[var(--pp-panel-border)] pt-5">
              <BooleanPanel
                source={editor.selectedObject}
                sourceKind={editor.selectedObjectType}
                target={booleanTarget}
                targetKind={booleanTargetKind}
                onApply={editor.handleBooleanApply}
                onCancel={editor.handleBooleanCancel}
              />
            </div>
          )}
      </Inspector>

      {editor.selectedObjectIds.length >= 2 && (
        <AlignBar
          distributeEnabled={editor.selectedObjectIds.length >= 3}
          onAlignAxis={editor.handleAlignAxis}
          onDistribute={() => editor.handleDistribute()}
        />
      )}

      {editor.mateSource && editor.mateTarget && (
        <MatePopover
          mode={editor.mateMode}
          offset={editor.mateOffset}
          onModeChange={editor.setMateMode}
          onOffsetChange={editor.setMateOffset}
          onConfirm={editor.handleMateConfirm}
          onCancel={editor.handleMateCancel}
        />
      )}

      {/* Contextual hint for active draw / tool flows */}
      {helpText && (
        <div className="pointer-events-none absolute bottom-[110px] left-1/2 z-20 -translate-x-1/2">
          <div className="pp-panel rounded-[10px] px-4 py-2 font-tech text-[12px] text-[var(--pp-text-secondary)]">
            {helpText}
          </div>
        </div>
      )}

      {editor.isPending && (
        <div className="absolute bottom-[26px] right-[336px] z-20">
          <span className="loading loading-spinner loading-xs text-[var(--pp-violet-text)]" />
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onDelete={editor.handleDeleteObject}
        />
      )}

      <ExportModal ref={exportModalRef} hasObjects={hasObjects} />
    </div>
  );
};
