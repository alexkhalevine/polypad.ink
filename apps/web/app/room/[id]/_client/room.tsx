"use client";

import { useParams } from "next/navigation";
import { Menu } from "@/app/components/menu";
import { Scene } from "./scene";
import { getHelpText } from "@/app/utils";
import { useRoomSocket } from "./realtime/use-room-socket";
import { useRoomEditor } from "./hooks/use-room-editor";

const idleState = { phase: "idle" as const };
const noop = () => {};

export const Room = () => {
  const params = useParams();
  const id = params.id;
  if (typeof id !== "string") throw new Error("invalid room id");

  const socket = useRoomSocket(id);
  const editor = useRoomEditor(id, socket);

  return (
    <>
      {(editor.selectedTool || editor.showSelectHelp || editor.showObjectSelected) && (
        <div className="p-4 absolute z-10 text-blue-200" id="help-text-container">
          <div className="chat chat-start mt-2">
            <div className="chat-bubble chat-bubble-primary text-xs py-2 px-4">
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
              <div className="chat-bubble chat-bubble-accent text-xs py-2 px-4">
                Press <kbd className="kbd kbd-xs">Esc</kbd> to deselect
              </div>
            </div>
          )}
        </div>
      )}
      <div className="relative w-full h-full flex flex-col">
        {editor.isPending && (
          <div className="absolute top-4 right-4">
            <span className="loading loading-spinner loading-xs"></span>
          </div>
        )}
        <div className="flex-1" onPointerLeave={() => socket.emitCursor(null)}>
          <Scene
            drawState={editor.activeDraw?.drawState ?? idleState}
            placedBoxes={editor.placedBoxes}
            placedCylinders={editor.placedCylinders}
            placedSpheres={editor.placedSpheres}
            onGroundRightClick={editor.activeDraw?.handleGroundRightClick ?? noop}
            onGroundPointerMove={editor.handleGroundPointerMove}
            onGroundClick={editor.activeDraw?.handleGroundClick ?? noop}
            onHeightPointerMove={editor.activeDraw?.handleHeightPointerMove ?? noop}
            onHeightClick={editor.activeDraw?.handleHeightClick ?? noop}
            onObjectMove={editor.handleObjectMove}
            onDragStart={editor.handleDragStart}
            onDragEnd={editor.handleDragEnd}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
          <Menu
            currentColor={editor.selectedObject?.color ?? "#2f74c0"}
            onToolSelect={editor.handleToolSelect}
            onSelectClick={editor.handleSelectClick}
            onMouseUpColorPicked={editor.onMouseUpColorPicked}
            onPositionCommit={editor.handlePositionCommit}
          />
        </div>
      </div>
    </>
  );
};
