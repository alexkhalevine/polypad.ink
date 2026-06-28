import { test, expect } from "@playwright/test";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function createRoom(request: import("@playwright/test").APIRequestContext) {
  const name = `zoom-controls-test-${Date.now()}`;
  const res = await request.post(`${API_BASE}/rooms`, {
    data: { name },
  });
  expect(res.ok()).toBeTruthy();
  const { id, inviteCode } = (await res.json()) as { id: string; inviteCode: string };
  return { id, inviteCode };
}

test("zoom in/out buttons step by 5%", async ({ page, request }) => {
  const { id, inviteCode } = await createRoom(request);

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(`/room/${id}?invite=${inviteCode}`, { waitUntil: "networkidle" });

  const zoomOut = page.getByRole("button", { name: "Zoom out" });
  const zoomIn = page.getByRole("button", { name: "Zoom in" });
  const zoomPanel = page.locator("div.pp-panel", { has: zoomOut });
  const zoomLabel = zoomPanel.locator("span", { hasText: /^\d+%$/ });

  // dispatchEvent bypasses real mouse hit-testing — Next.js dev mode renders a
  // floating indicator badge in the bottom-left corner that overlaps these buttons
  // and would otherwise swallow a real click at those coordinates.
  const click = (locator: typeof zoomOut) => locator.dispatchEvent("click");

  await expect(zoomLabel).toHaveText("100%");

  await click(zoomOut);
  await expect(zoomLabel).toHaveText("95%");

  await click(zoomOut);
  await expect(zoomLabel).toHaveText("90%");

  await click(zoomIn);
  await click(zoomIn);
  await click(zoomIn);
  await expect(zoomLabel).toHaveText("105%");

  expect(consoleErrors).toEqual([]);
});
