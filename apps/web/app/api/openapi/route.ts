const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function GET() {
  const res = await fetch(`${API_URL}/openapi.json`, { cache: "no-store" });
  const spec = await res.json();
  return Response.json(spec);
}
