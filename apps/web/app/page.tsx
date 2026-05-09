"use client";

import { HcaptchaButton } from "./components/hcaptcha-button";
import { ContactFormModal } from "./components/contact-form-modal";
import { RotatingCube } from "./components/rotating-cube";
import { useState } from "react";
import { useRouter } from "next/navigation";
import "./globals.css";

export default function Home() {
  const [showCaptcha, setShowCaptcha] = useState(false);
  const router = useRouter();

  function openFeedbackModal() {
    const modal = document.getElementById("contact-form-modal") as HTMLDialogElement | null;
    modal?.showModal();
  }

  function handleVerify(token: string) {
    // In production, you would validate the token on the server
    console.log("hCaptcha verified, token:", token);
    // Save token to cookie for server-side verification
    document.cookie = `hcaptcha_token=${token}; path=/; max-age=300`;
    // Redirect to setup page for server-side verification
    router.push(`/room/setup`);
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col hp-bg">
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
            <h1 className="w-full text-gradient text-4xl sm:text-5xl font-sans font-semibold tracking-tight text-base-content">
              polypad
            </h1>
          </div>

          {/* Rotating wireframe cube */}
          <RotatingCube />

          <div className="flex flex-col items-center">
            <pre className="text-lg text-base-content/60 font-sans text-purple-300 text-left mb-10">
              Create 3d scene in real-time collaboration with
              anyone.
            </pre>
            <div className="flex gap-4 items-center">
              {!showCaptcha ? (
                <button
                  onClick={() => setShowCaptcha(true)}
                  className="btn btn-bg-1 btn-lg font-sans font-medium px-8 text-purple-950"
                >
                  Create Drawing Room
                </button>
              ) : (
                <div className="flex flex-col items-center gap-4 mt-4">
                  <HcaptchaButton onVerify={handleVerify} theme="light" />
                </div>
              )}
              <a
                href="https://github.com/alexkhalevine/polypad.ink"
                target="_blank"
                className="btn btn-bg-2 btn-lg font-sans font-medium px-8 text-purple-950"
              >
                Visit Repo
              </a>
              <button
                onClick={openFeedbackModal}
                className="btn btn-bg-3 btn-lg font-sans font-medium px-8 text-purple-950"
              >
                Send Feedback
              </button>
            </div>
          </div>
        </div>

        <ContactFormModal dialogId="contact-form-modal" />
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
