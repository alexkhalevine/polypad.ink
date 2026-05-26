import Link from "next/link";

export function PolypadLogo() {
  return (
    <Link href="/" id="logo-container" className="flex flex-col gap-4">
      <h1 className="w-full text-gradient text-4xl sm:text-5xl font-sans font-semibold tracking-tight text-base-content">
        polypad
      </h1>
    </Link>
  );
}
