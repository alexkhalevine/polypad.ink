import { ToolType } from "@/app/room/[id]/_client/types";

const menuItems: { name: ToolType; label: string }[] = [
  { name: "box", label: "Box" },
  { name: "cylinder", label: "Cylinder" },
  { name: "sphere", label: "Sphere" },
];

export const Menu = ({
  selectedTool,
  onToolSelect,
  snapEnabled,
  onSnapToggle,
}: {
  selectedTool: ToolType | null;
  onToolSelect: (tool: ToolType) => void;
  snapEnabled: boolean;
  onSnapToggle: () => void;
}) => {
  return (
    <div className="flex justify-between w-full">
      <div className="flex gap-8">
        {menuItems.map((item) => (
          <div
            key={item.name}
            onClick={() => onToolSelect(item.name)}
            className={`flex justify-center items-center w-24 h-24 hover:scale-110 transition-transform cursor-pointer select-none ${
              selectedTool === item.name
                ? "bg-blue-400 ring-2 ring-white"
                : "bg-blue-700"
            }`}
          >
            {item.label}
          </div>
        ))}
      </div>
      <div id="snap-controls">
        <div id="snap-to-grid">
          <span>{`snap to grid: ${snapEnabled ? "on" : "off"}`}</span>
          <button
            id="snap-btn"
            onClick={onSnapToggle}
            className={`px-2 py-5 text-black ${snapEnabled ? "bg-green-400" : "bg-red-500"}`}
          >
            snap to grid
          </button>
        </div>
      </div>
    </div>
  );
};
