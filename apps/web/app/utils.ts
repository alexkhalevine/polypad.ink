import { DrawState } from "./room/[id]/_client/types";

type HelpContext = {
  phase?: DrawState["phase"];
  showSelectHelp?: boolean;
  showObjectSelected?: boolean;
  selectedObjectCoords?: string | null;
  selectedTool?: string | null;
};

export function getHelpText(ctx: HelpContext): string {
  const { phase, showSelectHelp, showObjectSelected, selectedObjectCoords, selectedTool } = ctx;

  if (selectedTool === "move") {
    return "Move the selected object";
  }
  if (phase === "height") {
    return "drag mouse to define the height of the primitive, left click to confirm";
  }
  if (phase === "footprint") {
    return "drag the mouse to define the geometry base, left click to confirm";
  }
  if (showSelectHelp) {
    return "select object you like to edit";
  }
  if (showObjectSelected && selectedObjectCoords) {
    return `object selected ${selectedObjectCoords}`;
  }
  return "click right mouse button somewhere on the ground plate to start drawing, left click to place the primitive";
}
