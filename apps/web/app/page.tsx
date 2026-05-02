"use client";

import { HcaptchaButton } from "./components/hcaptcha-button";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [showCaptcha, setShowCaptcha] = useState(false);
  const router = useRouter();

  function handleVerify(token: string) {
    // In production, you would validate the token on the server
    console.log("hCaptcha verified, token:", token);
    // Save token to cookie for server-side verification
    document.cookie = `hcaptcha_token=${token}; path=/; max-age=300`;
    // Redirect to setup page for server-side verification
    router.push(`/room/setup`);
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Minimal nav */}
      <nav className="w-full px-6 py-4 flex items-center justify-center">
        <span className="font-sans font-medium text-base text-base-content/80">
          Polypad
        </span>
      </nav>

      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-xl w-full flex flex-col items-center text-center gap-8">
          {/* Hero text */}
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl sm:text-5xl font-sans font-semibold tracking-tight text-base-content">
              Create 3D drawings together
            </h1>
            <p className="text-lg text-base-content/60 font-sans">
              Draw boxes, cylinders, and spheres in real-time collaboration with anyone.
            </p>
          </div>

          {/* CTA Button */}
          {!showCaptcha ? (
            <button
              onClick={() => setShowCaptcha(true)}
              className="btn btn-primary btn-lg font-sans font-medium px-8"
            >
              Create Drawing Room
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4 mt-4">
              <HcaptchaButton
                onVerify={handleVerify}
                theme="light"
              />
            </div>
          )}
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="w-full px-6 py-4 flex items-center justify-center">
        <span className="text-sm text-base-content/40 font-sans">
          No account needed
        </span>
      </footer>
    </div>
  );
}
