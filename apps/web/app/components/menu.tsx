import { ToolType } from "@/app/room/[id]/_client/types";
import cubeIcon from "@/app/assets/images/cube.png";
import cylinderIcon from "@/app/assets/images/cilinder.png";
import sphereIcon from "@/app/assets/images/sphere.png";
import moveIcon from "@/app/assets/svg/move.svg";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { useRoomStore } from "@/app/room/[id]/_client/room-store";

type IconSrc = ImageProps["src"];

const objectOperationItems: { name: string; label: string; icon: IconSrc }[] = [
  { name: "move", label: "Move", icon: moveIcon },
];

type Axis = "x" | "y" | "z";

function PositionAxisInput({
  axis,
  value,
  onCommit,
}: {
  axis: Axis;
  value: number;
  onCommit: (next: number) => void;
}) {
  // Derive draft from `value` during render — when the parent updates `value`
  // (e.g. during a gizmo drag), reset the draft so the field reflects it.
  // While the user is typing, only `draft` changes, so no reset triggers.
  const [draft, setDraft] = useState(value.toFixed(2));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value.toFixed(2));
  }

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(value.toFixed(2));
      return;
    }
    if (parsed !== value) onCommit(parsed);
  };

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-blue-700 uppercase">{axis}</span>
      <input
        type="number"
        step="0.1"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="input input-bordered input-sm w-20 text-center text-blue-700 font-mono"
      />
    </div>
  );
}

const primitiveObjectMenuItems: { name: ToolType; label: string; icon: IconSrc }[] = [
  { name: "box", label: "Box", icon: cubeIcon },
  { name: "cylinder", label: "Cylinder", icon: cylinderIcon },
  { name: "sphere", label: "Sphere", icon: sphereIcon },
];

export const Menu = ({
  currentColor,
  onToolSelect,
  onSelectClick,
  onMouseUpColorPicked,
  onPositionCommit,
}: {
  currentColor: string;
  onToolSelect: (tool: ToolType) => void;
  onSelectClick: () => void;
  onMouseUpColorPicked: () => void;
  onPositionCommit: (x: number, y: number, z: number) => void;
}) => {
  const selectedTool = useRoomStore((s) => s.selectedTool);
  const snapEnabled = useRoomStore((s) => s.snapEnabled);
  const wireframeEnabled = useRoomStore((s) => s.wireframeEnabled);
  const selectionMode = useRoomStore((s) => s.selectionMode);
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const livePositions = useRoomStore((s) => s.livePositions);
  const setSelectedColor = useRoomStore((s) => s.setSelectedColor);
  const setSelectedTool = useRoomStore((s) => s.setSelectedTool);
  const toggleSnap = useRoomStore((s) => s.toggleSnap);
  const toggleWireframe = useRoomStore((s) => s.toggleWireframe);

  const moveEnabled = !!selectedObjectId;
  const colorPickerEnabled = !!selectedObjectId;
  const livePosition = selectedObjectId ? livePositions[selectedObjectId] ?? null : null;

  return (
    <div className="flex justify-between w-full items-end p-4 bg-indigo-600/25">
      <div className="flex flex-col gap-4">
        {moveEnabled && livePosition && (
          <div className="flex gap-2 items-center">
            {(["x", "y", "z"] as const).map((axis) => (
              <PositionAxisInput
                key={axis}
                axis={axis}
                value={livePosition[axis]}
                onCommit={(next) =>
                  onPositionCommit(
                    axis === "x" ? next : livePosition.x,
                    axis === "y" ? next : livePosition.y,
                    axis === "z" ? next : livePosition.z,
                  )
                }
              />
            ))}
          </div>
        )}
        <div className="flex gap-8">
          {objectOperationItems.map((item) => (
            <button
              key={item.name}
              id={item.name}
              disabled={item.name === "move" && !moveEnabled}
              onClick={() => {
                if (item.name === "move" && moveEnabled) {
                  setSelectedTool("move");
                }
              }}
              className={`btn text-blue-100 ${
                selectedTool === item.name
                  ? "bg-blue-400 ring-2 ring-white"
                  : "bg-blue-700"
              } ${item.name === "move" && !moveEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {item.label}
              <Image
                src={item.icon}
                alt={`${item.label} icon`}
                className="w-8 h-8 ml-2 mix-blend-overlay rounded-full"
              />
            </button>
          ))}
        </div>
        <div className="flex gap-8">
          {primitiveObjectMenuItems.map((item) => (
            <div
              key={item.name}
              onClick={() => onToolSelect(item.name)}
              className={`btn text-blue-100 ${
                selectedTool === item.name
                  ? "bg-blue-400 ring-2 ring-white"
                  : "bg-blue-700"
              }`}
            >
              {item.label}
              <Image
                src={item.icon}
                alt={`${item.label} icon`}
                className="w-8 h-8 ml-2 mix-blend-overlay rounded-full"
              />
            </div>
          ))}
        </div>
      </div>

      <div
        id="snap-controls"
        className="flex flex-col gap-2 p-4 text-blue-200 text-sm"
      >
        <div
          id="select-mode"
          className="flex items-center gap-2 justify-between"
        >
          <span>select</span>
          <input
            type="checkbox"
            checked={selectionMode === "select"}
            onChange={onSelectClick}
            className="toggle"
          />
        </div>
        <div
          id="snap-to-grid"
          className="flex items-center gap-2 justify-between"
        >
          <span>snap to grid</span>
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={toggleSnap}
            className="toggle"
          />
        </div>
        <div
          id="wireframe-mode"
          className="flex items-center gap-2 justify-between"
        >
          <span>wireframe</span>
          <input
            type="checkbox"
            checked={wireframeEnabled}
            onChange={toggleWireframe}
            className="toggle"
          />
        </div>
        <div
          id="color-picker"
          className="flex items-center gap-2 justify-between"
        >
          <span>change color</span>
          <input
            type="color"
            disabled={!colorPickerEnabled}
            value={currentColor}
            id="color-input"
            onChange={(e) => setSelectedColor(e.target.value)}
            className={`w-8 h-8 ${!colorPickerEnabled ? "opacity-50" : ""}`}
            onBlur={() => {
              onMouseUpColorPicked();
            }}
          />
        </div>
      </div>
    </div>
  );
};
