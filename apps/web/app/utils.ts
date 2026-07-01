import { DrawState } from "./room/[id]/_client/types";

type HelpContext = {
  phase?: DrawState["phase"];
  showSelectHelp?: boolean;
  showObjectSelected?: boolean;
  showMultiSelected?: boolean;
  selectedCount?: number;
  selectedObjectCoords?: string | null;
  selectedTool?: string | null;
};

export function getHelpText(ctx: HelpContext): string {
  const { phase, showSelectHelp, showObjectSelected, showMultiSelected, selectedCount, selectedObjectCoords, selectedTool } = ctx;

  if (selectedTool === "move") {
    return "Move the selected object";
  }
  if (selectedTool === "clone") {
    return "Move the cursor to where you want the clone, then click. Esc to cancel.";
  }
  if (selectedTool === "mate") {
    return "Click a face on the source object, then a face on the target. Enter to confirm, Esc to cancel.";
  }
  if (phase === "height") {
    return "drag mouse to define the height of the primitive, left click to confirm";
  }
  if (phase === "footprint") {
    return "drag the mouse to define the geometry base, left click to confirm";
  }
  if (showMultiSelected) {
    return `${selectedCount} objects selected — use the align bar below`;
  }
  if (showSelectHelp) {
    return "select object you like to edit";
  }
  if (showObjectSelected && selectedObjectCoords) {
    return `object selected ${selectedObjectCoords}`;
  }
  return "click left mouse button somewhere on the ground plate to start drawing, left click to place the primitive";
}
