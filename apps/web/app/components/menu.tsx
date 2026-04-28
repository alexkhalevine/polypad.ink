const menuItems = [
  {
    name: "box",
    color: "bg-blue-700",
  },
  {
    name: "cilinder",
    color: "bg-blue-700",
  },
  {
    name: "sphere",
    color: "bg-blue-700",
  },
];
export const Menu = () => {
  return (
    <div className="flex gap-8">
      {menuItems.map((item) => (
        <div
          key={item.name}
          className={`flex justify-center items-center w-24 h-24 ${item.color} hover:scale-110 transition-transform cursor-pointer`}
        >
          {item.name}
        </div>
      ))}
    </div>
  );
};
