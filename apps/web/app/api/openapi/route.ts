const API_URL = process.env.API_URL ?? "https://api.polypad.ink";

export async function GET() {
  const res = await fetch(`${API_URL}/openapi.json`, { cache: "no-store" });
  const spec = await res.json();
  return Response.json(spec);
}
