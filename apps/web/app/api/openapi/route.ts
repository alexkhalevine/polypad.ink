const API_URL =
  process.env.POLYPAD_API_URL ??
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "https://api.polypad.ink";

export async function GET() {
  const res = await fetch(`${API_URL}/openapi.json`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
  const bodyText = await res.text();

  if (!res.ok) {
    return Response.json(
      {
        error: "Failed to fetch OpenAPI spec from upstream",
        upstreamStatus: res.status,
        upstreamContentType: contentType || null,
      },
      { status: 502 },
    );
  }

  if (!contentType.includes("application/json")) {
    return Response.json(
      {
        error: "Upstream OpenAPI response is not JSON",
        upstreamContentType: contentType || null,
        preview: bodyText.slice(0, 200),
      },
      { status: 502 },
    );
  }

  try {
    return Response.json(JSON.parse(bodyText));
  } catch {
    return Response.json(
      {
        error: "Invalid JSON returned by upstream OpenAPI endpoint",
        preview: bodyText.slice(0, 200),
      },
      { status: 502 },
    );
  }
}
