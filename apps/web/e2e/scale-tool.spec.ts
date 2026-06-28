import { test, expect } from "@playwright/test";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function createRoom(request: import("@playwright/test").APIRequestContext) {
  const name = `scale-tool-test-${Date.now()}`;
  const res = await request.post(`${API_BASE}/rooms`, {
    data: { name },
  });
  expect(res.ok()).toBeTruthy();
  const { id, inviteCode } = (await res.json()) as { id: string; inviteCode: string };
  return { id, inviteCode };
}

test("scale gizmo resizes a selected box and persists the new dimensions", async ({
  page,
  request,
}) => {
  const { id, inviteCode } = await createRoom(request);

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(`/room/${id}?invite=${inviteCode}`, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Box" }).click();
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas not found");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Draw a footprint, then click for height — the draw flow is click/click/click,
  // not a drag. Each click is preceded by a move so the scene's pointer-move
  // handlers (which drive the draw preview) see the new position first.
  await page.mouse.move(cx - 60, cy + 40);
  await page.mouse.click(cx - 60, cy + 40);
  await page.mouse.move(cx + 60, cy - 40, { steps: 5 });
  await page.mouse.click(cx + 60, cy - 40);
  await page.mouse.move(cx, cy - 150, { steps: 5 });
  await page.mouse.click(cx, cy - 150);
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "Select" }).click();
  await page.mouse.click(cx, cy);

  const widthField = page.locator("text=DIMENSIONS").locator("..").locator("input").first();
  await expect(widthField).toBeVisible();
  const widthBefore = Number(await widthField.inputValue());

  await page.keyboard.press("e");

  // Drag the gizmo's X-axis handle (rendered just right of the box's near corner)
  // outward to grow the width.
  await page.mouse.move(cx + 130, cy - 22);
  await page.mouse.down();
  await page.mouse.move(cx + 220, cy - 22, { steps: 10 });
  await page.mouse.up();

  await expect
    .poll(async () => Number(await widthField.inputValue()))
    .toBeGreaterThan(widthBefore);

  const widthAfterDrag = Number(await widthField.inputValue());

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Select" }).click();
  await page.mouse.move(cx + 5, cy - 60, { steps: 5 });
  await page.mouse.click(cx + 5, cy - 60);
  await expect(widthField).toHaveValue(widthAfterDrag.toFixed(2));

  expect(consoleErrors).toEqual([]);
});
