import { test, expect } from "@playwright/test";

const SERVER_URL = "http://localhost:4000";

async function createRoom(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  suffix: string
): Promise<{ id: string; inviteCode: string }> {
  const res = await request.post(`${SERVER_URL}/rooms`, {
    data: { name: `e2e-${suffix}-${Date.now()}` },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { id: string; inviteCode: string };
}

test("3D canvas is visible when a room loads", async ({ page, request }) => {
  const { id, inviteCode } = await createRoom(request, "canvas");

  await page.goto(`/room/${id}?invite=${inviteCode}`);

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });
});

test("toolbar renders primitive shape tools", async ({ page, request }) => {
  const { id, inviteCode } = await createRoom(request, "toolbar");

  await page.goto(`/room/${id}?invite=${inviteCode}`);
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 15_000 });

  await expect(page.getByTestId("tool-box")).toBeVisible();
  await expect(page.getByTestId("tool-cylinder")).toBeVisible();
  await expect(page.getByTestId("tool-sphere")).toBeVisible();
});

test("draws a box shape and API call is made", async ({ page, request }) => {
  const { id, inviteCode } = await createRoom(request, "draw-box");

  await page.goto(`/room/${id}?invite=${inviteCode}`);
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 15_000 });

  // Listen for the place-object API call before triggering the draw
  const placeObjectPromise = page.waitForRequest(
    (req) =>
      req.url().includes(`/rooms/${id}/objects`) &&
      req.method() === "POST" &&
      !req.url().includes("/batch"),
    { timeout: 15_000 }
  );

  // Activate box draw tool
  await page.getByTestId("tool-box").click();

  // Box drawing is a 3-click flow on the 3D ground plane:
  // click 1 starts the footprint, click 2 confirms it and enters height
  // phase, click 3 confirms the height and places the box.
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounding box not found");

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.click(cx - 50, cy + 30);
  await page.mouse.move(cx + 50, cy + 30, { steps: 5 });
  await page.mouse.click(cx + 50, cy + 30);
  await page.mouse.move(cx + 50, cy - 50, { steps: 5 });
  await page.mouse.click(cx + 50, cy - 50);

  const placed = await placeObjectPromise;
  expect(placed).toBeTruthy();
});
