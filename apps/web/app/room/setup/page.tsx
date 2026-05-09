"use server";

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
    redirect(`/`);
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full flex flex-col items-center text-center gap-8">
        {/* Hero text */}
        <div className="flex flex-col gap-4">
          <h1 className="w-full text-gradient text-4xl sm:text-5xl font-sans font-semibold tracking-tight text-base-content">
            polypad
          </h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-md w-full">
            <h1 className="text-2xl font-sans font-semibold text-center mb-8">
              Name your room
            </h1>
            <RoomSetupForm token={token} />
          </div>
        </div>
      </div>
    </main>
  );
}
