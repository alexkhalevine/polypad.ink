import { test, expect } from "@playwright/test";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function createRoom(request: import("@playwright/test").APIRequestContext) {
  const name = `cone-tool-test-${Date.now()}`;
  const res = await request.post(`${API_BASE}/rooms`, {
    data: { name },
  });
  expect(res.ok()).toBeTruthy();
  const { id, inviteCode } = (await res.json()) as { id: string; inviteCode: string };
  return { id, inviteCode };
}

test("cone tool draws a cone that the inspector reports with radius and height", async ({
  page,
  request,
}) => {
  const { id, inviteCode } = await createRoom(request);

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(`/room/${id}?invite=${inviteCode}`, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Cone" }).click();
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas not found");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Cone draws like a cylinder: click the footprint start, click the footprint
  // end (defines the base radius), then click for the height. The flow is
  // click/click/click, not a drag — each click is preceded by a move so the
  // scene's pointer-move handlers (which drive the draw preview) see the new
  // position first.
  await page.mouse.move(cx, cy + 20);
  await page.mouse.click(cx, cy + 20);
  await page.mouse.move(cx + 70, cy + 20, { steps: 5 });
  await page.mouse.click(cx + 70, cy + 20);
  await page.mouse.move(cx + 70, cy - 120, { steps: 5 });
  await page.mouse.click(cx + 70, cy - 120);
  await page.waitForTimeout(300);

  // Select the cone and confirm the inspector shows its radius + height.
  await page.getByRole("button", { name: "Select" }).click();
  await page.mouse.move(cx, cy - 10, { steps: 5 });
  await page.mouse.click(cx, cy - 10);

  const dimsInputs = page.locator("text=DIMENSIONS").locator("..").locator("input");
  await expect(dimsInputs.first()).toBeVisible();
  await expect(dimsInputs).toHaveCount(2); // R and H

  const radius = Number(await dimsInputs.nth(0).inputValue());
  const height = Number(await dimsInputs.nth(1).inputValue());
  expect(radius).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);

  expect(consoleErrors).toEqual([]);
});
