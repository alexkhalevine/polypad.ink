"use server"

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setupRoom } from "./actions";

async function getHcaptchaTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const hcaptchaCookie = cookieStore.get("hcaptcha_token");
  return hcaptchaCookie?.value ?? null;
}

export default async function RoomSetupPage() {
  const token = await getHcaptchaTokenFromCookies();

  if (!token) {
    redirect(`/`)
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-sans font-semibold text-center mb-8">
          Name your room
        </h1>
        <form action={setupRoom} className="flex flex-col gap-6">
          <input type="hidden" name="token" value={token} />
          <input
            type="text"
            name="roomName"
            placeholder="room-name"
            className="input input-bordered w-full font-sans"
            required
          />
          <button className="btn" type="submit">
            Create Room
          </button>
        </form>
      </div>
    </div>
  );
}
