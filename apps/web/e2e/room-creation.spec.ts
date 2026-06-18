import { test, expect } from "@playwright/test";

test("creates a room and enters the 3D editor", async ({ page, context }) => {
  // The /room/setup page redirects to / if no hcaptcha_token cookie is present.
  // hCaptcha server-side verification is already bypassed in non-production (actions.ts:6).
  await context.addCookies([
    { name: "hcaptcha_token", value: "test", domain: "localhost", path: "/" },
  ]);

  await page.goto("/room/setup");

  const roomName = `e2e-test-${Date.now()}`;
  await page.getByPlaceholder("room-name").fill(roomName);
  await page.getByRole("button", { name: "Create Room" }).click();

  await page.waitForURL(/\/room\/.+/);
  expect(page.url()).toMatch(/\/room\/.+/);

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });
});
