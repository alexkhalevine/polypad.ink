"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RoomSetupForm } from "./room-setup-form";
import { RotatingCube } from "@/app/components/rotating-cube";

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
    <main className="polypad-dark relative flex-1 flex flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* Decorative perspective grid + slow-spinning wireframe cube */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] [perspective:900px]"
      >
        <div
          className="absolute left-1/2 top-[44%] h-[140%] w-[200%] -translate-x-1/2 [transform:rotateX(66deg)]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(140,150,210,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(140,150,210,0.18) 1px, transparent 1px)",
            backgroundSize: "120px 120px",
            maskImage:
              "radial-gradient(ellipse 50% 50% at 50% 35%, black 10%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 50% 50% at 50% 35%, black 10%, transparent 70%)",
          }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[26%] -translate-x-1/2 opacity-40"
      >
        <RotatingCube />
      </div>

      {/* Centered column */}
      <div className="relative z-10 flex w-[420px] max-w-full flex-col items-center text-center">
        <h1 className="text-gradient font-display text-[48px] font-bold leading-none tracking-[-0.04em]">
          polypad
        </h1>
        <p className="mt-2 font-display text-[15px] text-[var(--pp-text-muted)]">
          Collaborative 3D sketching, right in your browser.
        </p>

        <RoomSetupForm token={token} />

        <div className="mt-6 flex items-center gap-2 font-display text-[13px] text-[var(--pp-text-meta)]">
          <span className="pp-live-dot inline-block h-2 w-2 rounded-full bg-[var(--pp-mint)]" />
          Spin up a room and start building live.
        </div>
      </div>
    </main>
  );
}
