"use client";

import { useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Menu } from "@/app/components/menu";
import { Scene } from "./scene";
import { getHelpText } from "@/app/utils";
import { useRoomSocket } from "./realtime/use-room-socket";
import { useRoomEditor } from "./hooks/use-room-editor";
import { UserAvatars } from "./user-avatars";
import { InviteButton } from "./invite-button";
import { ContextMenu } from "./context-menu";
import { ExportModal } from "./export-modal";
import { AlignPanel } from "./align-panel";
import { RightPanel } from "./right-panel";
import { DimentionsPanel } from "./dimentions-panel";
import { ShortcutsHelp } from "./shortcuts-help";

const idleState = { phase: "idle" as const };
const noop = () => {};

export const Room = ({ inviteCode }: { inviteCode: string }) => {
  const params = useParams();
  const id = params.id;
  if (typeof id !== "string") throw new Error("invalid room id");

  const socket = useRoomSocket(id, inviteCode);
  const editor = useRoomEditor(id, socket);

  const exportModalRef = useRef<HTMLDialogElement>(null);
  const hasObjects =
    editor.placedBoxes.length +
      editor.placedCylinders.length +
      editor.placedSpheres.length >
    0;

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const openContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  return (
    <>
      {(editor.selectedTool ||
        editor.showSelectHelp ||
        editor.showObjectSelected) && (
        <div
          className="p-4 absolute z-10 text-blue-200"
          id="help-text-container"
        >
          <div className="chat chat-start mt-2">
            <div className="chat-bubble chat-bubble-primary text-md py-2 px-5 font-mono">
              {getHelpText({
                phase: editor.activeDraw?.drawState.phase,
                showSelectHelp: editor.showSelectHelp,
                showObjectSelected: editor.showObjectSelected,
                selectedObjectCoords: editor.selectedObjectCoords,
                selectedTool: editor.selectedTool,
              })}
            </div>
          </div>
          {editor.showObjectSelected && (
            <div className="chat chat-start mt-2">
              <div className="chat-bubble chat-bubble-accent text-md py-2 px-5 font-mono">
                Press <kbd className="kbd kbd-xs">Esc</kbd> to deselect
              </div>
            </div>
          )}
        </div>
      )}
      <div className="relative w-full h-full flex flex-col">
        <div className="absolute top-3 right-4 flex gap-3 items-start z-50">
          <InviteButton />
          <UserAvatars />
        </div>
        <ShortcutsHelp />
        <RightPanel>
          {editor.selectedObject && (
            <DimentionsPanel
              selectedObject={editor.selectedObject ?? null}
              selectedObjectType={editor.selectedObjectType}
              onDimensionCommit={editor.handleDimensionCommit}
            />
          )}
          {editor.selectedTool === "align" && (
            <div className="mt-5 border-t-2 border-teal-700 pt-5">
              <AlignPanel
                onApply={editor.handleAlignApply}
                onCancel={editor.handleAlignCancel}
              />
            </div>
          )}
        </RightPanel>
        {editor.isPending && (
          <div className="absolute top-4 right-4">
            <span className="loading loading-spinner loading-xs"></span>
          </div>
        )}
        <div
          className="flex-1"
          onPointerLeave={() => socket.emitCursor(null)}
          onContextMenu={openContextMenu}
        >
          <Scene
            roomId={id}
            drawState={editor.activeDraw?.drawState ?? idleState}
            placedBoxes={editor.placedBoxes}
            placedCylinders={editor.placedCylinders}
            placedSpheres={editor.placedSpheres}
            selectedObject={editor.selectedObject ?? null}
            selectedObjectType={editor.selectedObjectType}
            onGroundStartDraw={editor.activeDraw?.handleGroundStartDraw ?? noop}
            onGroundPointerMove={editor.handleGroundPointerMove}
            onGroundClick={editor.activeDraw?.handleGroundClick ?? noop}
            onHeightPointerMove={
              editor.activeDraw?.handleHeightPointerMove ?? noop
            }
            onHeightClick={editor.activeDraw?.handleHeightClick ?? noop}
            onObjectMove={editor.handleObjectMove}
            onDragStart={editor.handleDragStart}
            onDragEnd={editor.handleDragEnd}
            onDimensionCommit={editor.handleDimensionCommit}
          />
        </div>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={closeContextMenu}
            onDelete={editor.handleDeleteObject}
          />
        )}

        <ExportModal ref={exportModalRef} hasObjects={hasObjects} />

        <div className="absolute bottom-0 left-0 right-0 flex justify-center flex-col">
          <div className="flex f-full p-5 justify-end">
            <button
              className="btn btn-sm bg-indigo-900 text-indigo-200 border-indigo-700 hover:bg-indigo-800"
              onClick={() => exportModalRef.current?.showModal()}
            >
              Export
            </button>
          </div>

          <Menu
            currentColor={editor.selectedObject?.color ?? "#2f74c0"}
            selectedObject={editor.selectedObject ?? null}
            selectedObjectType={editor.selectedObjectType}
            onToolSelect={editor.handleToolSelect}
            onSelectClick={editor.handleSelectClick}
            onMouseUpColorPicked={editor.onMouseUpColorPicked}
            onPositionCommit={editor.handlePositionCommit}
            onDimensionCommit={editor.handleDimensionCommit}
          />
        </div>
      </div>
    </>
  );
};
