import { ToolType } from "@/app/room/[id]/_client/types";
import cubeIcon from "@/app/assets/images/cube.png";
import cylinderIcon from "@/app/assets/images/cilinder.png";
import sphereIcon from "@/app/assets/images/sphere.png";
import Image from "next/image";

const menuItems: { name: ToolType; label: string; icon: any }[] = [
  { name: "box", label: "Box", icon: cubeIcon },
  { name: "cylinder", label: "Cylinder", icon: cylinderIcon },
  { name: "sphere", label: "Sphere", icon: sphereIcon },
];

export const Menu = ({
  selectedTool,
  onToolSelect,
  snapEnabled,
  onSnapToggle,
  wireframeEnabled,
  onWireframeToggle,
  selectionMode,
  onSelectClick,
  colorPickerEnabled,
  currentColor,
  onColorChange,
  onMouseUpColorPicked,
}: {
  selectedTool: ToolType | null;
  onToolSelect: (tool: ToolType) => void;
  snapEnabled: boolean;
  onSnapToggle: () => void;
  wireframeEnabled: boolean;
  onWireframeToggle: () => void;
  selectionMode: "draw" | "select";
  onSelectClick: () => void;
  colorPickerEnabled: boolean;
  currentColor: string;
  onColorChange: (color: string) => void;
  onMouseUpColorPicked: () => void;
}) => {
  return (
    <div className="flex justify-between w-full items-end p-4 bg-indigo-600/25">
      <div className="flex gap-8">
        {menuItems.map((item) => (
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
      <div id="snap-controls" className="flex flex-col gap-2 p-4">
        <div id="snap-to-grid" className="flex items-center gap-2 justify-between">
          <span>snap to grid</span>
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={onSnapToggle}
            className="toggle"
          />
        </div>
        <div id="wireframe-mode" className="flex items-center gap-2 justify-between">
          <span>wireframe</span>
          <input
            type="checkbox"
            checked={wireframeEnabled}
            onChange={onWireframeToggle}
            className="toggle"
          />
        </div>
        <div id="select-mode" className="flex items-center gap-2 justify-between">
          <span>select</span>
          <input
            type="checkbox"
            checked={selectionMode === "select"}
            onChange={onSelectClick}
            className="toggle"
          />
        </div>
        <div id="color-picker" className="flex items-center gap-2 justify-between">
          <span>change color</span>
          <input
            type="color"
            disabled={!colorPickerEnabled}
            value={currentColor}
            id="color-input"
            onChange={(e) => onColorChange(e.target.value)}
            className={`w-8 h-8 ${!colorPickerEnabled ? "opacity-50" : ""}`}
            onPointerUp={(e) => {
              // onPointerUp fires when user releases within the picker
              // We still use onMouseUpColorPicked as a fallback for blur
            }}
            onBlur={() => {
              // onBlur fires when picker closes - commit the mutation
              onMouseUpColorPicked();
            }}
          />
        </div>
      </div>
    </div>
  );
};
