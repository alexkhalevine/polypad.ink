import { test, expect } from "@playwright/test";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function createRoom(request: import("@playwright/test").APIRequestContext) {
  const name = `grid-opacity-test-${Date.now()}`;
  const res = await request.post(`${API_BASE}/rooms`, {
    data: { name },
  });
  expect(res.ok()).toBeTruthy();
  const { id, inviteCode } = (await res.json()) as { id: string; inviteCode: string };
  return { id, inviteCode };
}

test("grid opacity slider controls grid visibility", async ({ page, request }) => {
  const { id, inviteCode } = await createRoom(request);

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(`/room/${id}?invite=${inviteCode}`, { waitUntil: "networkidle" });

  const opacityRow = page.locator("div", { hasText: "Grid opacity" }).last();
  const slider = page.locator('input.pp-range.w-full[type="range"]');
  const valueLabel = opacityRow.getByText(/^\d+%$/);

  await expect(slider).toBeVisible();
  await expect(slider).toBeEnabled();
  await expect(valueLabel).toHaveText("100%");

  await slider.fill("0");
  await expect(valueLabel).toHaveText("0%");

  await slider.fill("50");
  await expect(valueLabel).toHaveText("50%");

  expect(consoleErrors).toEqual([]);
});
