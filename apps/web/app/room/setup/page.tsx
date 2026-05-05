"use server"

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RoomSetupForm } from "./room-setup-form";

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
    <>
      <nav className="w-full px-6 py-4 flex items-center justify-center">
        <span className="font-sans font-medium text-base text-blue-100">
          Polypad
        </span>
      </nav>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <h1 className="text-2xl font-sans font-semibold text-center mb-8">
            Name your room
          </h1>
          <RoomSetupForm token={token} />
        </div>
      </div>
    </>
  );
}
