import { API_BASE } from "@/app/room/[id]/_client/queries/api-base";
import { jsonHeaders } from "@/app/room/[id]/_client/queries/api-headers";
import { ApiError } from "@/app/room/[id]/_client/queries/api-error";

// orval calls customFetch(url, RequestInit) and expects the return value to be
// wrapped as { data: T, status: number, headers: Headers } because the generated
// types use discriminated unions over status codes.
export async function customFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("Polypad API client is client-side only");
  }

  const fullUrl = `${API_BASE}${url}`;

  // Merge jsonHeaders (Content-Type + x-polypad-user-id) with any headers the
  // generated code already set (e.g. Content-Type for POST bodies). Use Headers
  // constructor to safely handle any HeadersInit shape.
  const mergedHeaders = Object.fromEntries(new Headers(jsonHeaders()));
  if (options.headers) {
    Object.assign(mergedHeaders, Object.fromEntries(new Headers(options.headers)));
  }

  const response = await fetch(fullUrl, { ...options, headers: mergedHeaders });

  if (!response.ok) {
    throw new ApiError(
      `${String(options.method ?? "GET").toUpperCase()} ${url} failed`,
      response.status,
    );
  }

  const status = response.status;
  const headers = response.headers;

  if (status === 204) {
    return { data: undefined, status, headers } as T;
  }

  const data = await response.json();
  return { data, status, headers } as T;
}
