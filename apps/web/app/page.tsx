"use client";

import { HcaptchaButton } from "./components/hcaptcha-button";
import { ContactFormModal } from "./components/contact-form-modal";
import { RotatingCube } from "./components/rotating-cube";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import "./globals.css";

const MCP_TOOLS = [
  {
    name: "Inspect",
    desc: "List every shape in the room — positions, dimensions, and colors.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    name: "Place Shapes",
    desc: "Add boxes, cylinders, and spheres at any position with custom colors.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    name: "Batch Build",
    desc: "Create entire scenes in one command — ideal for complex structures.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    name: "Move",
    desc: "Reposition any existing object to a new location in 3D space.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    name: "Colorize",
    desc: "Change any shape's color using hex values like #ff0000 or #3b82f6.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
      </svg>
    ),
  },
  {
    name: "Remove",
    desc: "Delete any shape from the scene by its ID.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    ),
  },
];

const CLAUDE_DESKTOP_CONFIG = `{
  "mcpServers": {
    "polypad": {
      "command": "node",
      "args": ["/path/to/polypad.ink/apps/mcp/dist/index.js"],
      "env": {
        "POLYPAD_DEFAULT_ROOM_ID": "your-room-id",
        "API_URL": "http://localhost:4000"
      }
    }
  }
}`;

export default function Home() {
  const [showCaptcha, setShowCaptcha] = useState(false);
  const router = useRouter();
  const mcpRef = useRef<HTMLElement>(null);

  function openFeedbackModal() {
    const modal = document.getElementById("contact-form-modal") as HTMLDialogElement | null;
    modal?.showModal();
  }

  function handleVerify(token: string) {
    console.log("hCaptcha verified, token:", token);
    document.cookie = `hcaptcha_token=${token}; path=/; max-age=300`;
    router.push(`/room/setup`);
  }

  function scrollToMcp() {
    mcpRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col hp-bg">
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
            <div className="flex flex-wrap gap-4 items-center justify-center">
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
              <a
                href="/api-docs"
                className="btn btn-bg-4 btn-lg font-sans font-medium px-8 text-purple-950"
              >
                API Docs
              </a>
            </div>

            {/* Scroll to MCP section */}
            <button
              onClick={scrollToMcp}
              className="mt-10 flex flex-col items-center gap-2 text-purple-300/70 hover:text-purple-200 transition-colors font-sans text-sm cursor-pointer"
            >
              <span>Use with AI Agents</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>

        <ContactFormModal dialogId="contact-form-modal" />
      </main>

      {/* MCP section */}
      <section
        ref={mcpRef}
        className="w-full px-6 py-20 flex flex-col items-center gap-14"
        style={{ background: "rgba(10, 5, 40, 0.72)", backdropFilter: "blur(2px)" }}
      >
        {/* Header */}
        <div className="max-w-2xl w-full flex flex-col items-center text-center gap-4">
          <span className="text-xs font-mono tracking-widest text-purple-400/80 uppercase">Model Context Protocol</span>
          <h2 className="text-3xl sm:text-4xl font-sans font-semibold text-white leading-tight">
            Let AI build your 3D scenes
          </h2>
          <p className="text-purple-200/70 font-sans text-base leading-relaxed">
            Connect any MCP-compatible AI assistant — Claude, Cursor, or your own agent — to a Polypad room.
            Describe what you want and watch shapes appear in real-time collaboration.
          </p>
        </div>

        {/* Tool capability grid */}
        <div className="max-w-3xl w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MCP_TOOLS.map((tool) => (
            <div
              key={tool.name}
              className="flex flex-col gap-3 p-5 rounded-xl border border-purple-500/20 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="text-purple-300">{tool.icon}</span>
              <span className="font-sans font-semibold text-white text-sm">{tool.name}</span>
              <p className="font-sans text-purple-200/60 text-xs leading-relaxed">{tool.desc}</p>
            </div>
          ))}
        </div>

        {/* Setup */}
        <div className="max-w-2xl w-full flex flex-col gap-5">
          <h3 className="font-sans font-semibold text-white text-lg text-center">Connect in two steps</h3>
          <ol className="flex flex-col gap-4 font-sans text-sm text-purple-200/80 list-none">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600/50 text-white flex items-center justify-center text-xs font-bold">1</span>
              <span>
                Build the MCP server from the repo:
                <code className="block mt-2 px-3 py-2 rounded-lg bg-black/40 text-purple-300 font-mono text-xs">
                  pnpm --filter mcp build
                </code>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600/50 text-white flex items-center justify-center text-xs font-bold">2</span>
              <span>
                Add to your Claude Desktop (or any MCP client) config:
                <pre className="mt-2 px-3 py-3 rounded-lg bg-black/40 text-purple-300 font-mono text-xs overflow-x-auto whitespace-pre">
                  {CLAUDE_DESKTOP_CONFIG}
                </pre>
              </span>
            </li>
          </ol>
          <p className="text-center text-purple-300/50 font-sans text-xs">
            Replace <code className="text-purple-300/80">your-room-id</code> with the ID from any Polypad room URL.
          </p>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="w-full px-6 py-4 flex items-center justify-center" style={{ background: "rgba(10, 5, 40, 0.72)" }}>
        <span className="text-sm text-purple-300/30 font-sans">
          No account needed
        </span>
      </footer>
    </div>
  );
}
