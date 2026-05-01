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
        <div id="snap-to-grid" className="flex items-center gap-2">
          <span>snap to grid</span>
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={onSnapToggle}
            className="toggle"
          />
        </div>
      </div>
    </div>
  );
};
