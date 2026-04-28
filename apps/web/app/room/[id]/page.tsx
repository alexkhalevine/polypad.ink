"use client";

import { Room } from "./_client/room";

function RoomPage() {
  return (
    <div className="border-2 border-cyan-700 rounded-md flex flex-col flex-1 bg-zinc-50 font-sans dark:bg-black overflow-hidden">
      <main>
        <Room />
      </main>
    </div>
  );
}

export default RoomPage;
