import { notFound } from "next/navigation";
import { Room } from "./_client/room";

export const metadata = { referrer: "same-origin" as const };

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const invite = typeof sp.invite === "string" ? sp.invite : null;
  if (!invite) notFound();

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const res = await fetch(
    `${apiBase}/rooms/${encodeURIComponent(id)}/verify?code=${encodeURIComponent(invite)}`,
    { cache: "no-store" },
  );
  if (!res.ok) notFound();

  return (
    <div className="border-2 border-cyan-700 rounded-md flex flex-col flex-1 overflow-hidden">
      <main className="h-full flex flex-col flex-1">
        <Room inviteCode={invite} />
      </main>
    </div>
  );
}
