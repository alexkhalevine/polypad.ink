import Link from "next/link";

export function PolypadLogo() {
  return (
    <Link href="/" id="logo-container" className="flex items-end gap-2">
      <h1 className="w-full text-gradient text-4xl sm:text-5xl font-sans font-semibold tracking-tight text-base-content">
        polypad
      </h1>
      <span className="mb-1 sm:mb-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
        beta
      </span>
    </Link>
  );
}
