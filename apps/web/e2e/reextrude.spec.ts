import { test, expect, type Page } from "@playwright/test";

const SERVER_URL = "http://localhost:4000";

async function createRoom(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  suffix: string,
): Promise<{ id: string; inviteCode: string }> {
  const res = await request.post(`${SERVER_URL}/rooms`, {
    data: { name: `e2e-${suffix}-${Date.now()}` },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { id: string; inviteCode: string };
}

/** A non-batch POST that places an object of the given type in this room. */
function placeMeshRequest(id: string) {
  return (req: import("@playwright/test").Request) =>
    req.url().includes(`/rooms/${id}/objects`) &&
    req.method() === "POST" &&
    !req.url().includes("/batch") &&
    (req.postData() ?? "").includes('"type":"mesh"');
}

async function drawBox(page: Page) {
  await page.getByTestId("tool-box").click();
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounding box not found");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // 3-click footprint → height flow (same as editor-basics).
  await page.mouse.click(cx - 50, cy + 30);
  await page.mouse.move(cx + 50, cy + 30, { steps: 5 });
  await page.mouse.click(cx + 50, cy + 30);
  await page.mouse.move(cx + 50, cy - 50, { steps: 5 });
  await page.mouse.click(cx + 50, cy - 50);
  return { cx, cy };
}

// Verifies the actual fix: with face-select on by default, selecting a placed object
// and clicking a face arms the extrude (the numeric distance input appears), and the
// resulting mesh can be extruded AGAIN without re-arming any tool.
test("an extruded mesh can be extruded again by clicking its face", async ({ page, request }) => {
  const { id, inviteCode } = await createRoom(request, "reextrude");

  await page.goto(`/room/${id}?invite=${inviteCode}`);
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 15_000 });

  const firstPlace = page.waitForRequest(placeMeshRequest(id), { timeout: 15_000 });

  const { cx, cy } = await drawBox(page);

  // Leave the box tool, enter select mode, click the box to select it.
  await page.keyboard.press("Escape");
  await page.keyboard.press("s");
  await page.mouse.move(cx, cy - 10, { steps: 5 });
  await page.mouse.click(cx, cy - 10);

  // Click a face of the *selected* box → face-select default arms the extrude tool,
  // which renders the numeric distance input. This is the interaction that was
  // previously gated off by default.
  await page.mouse.move(cx, cy - 20, { steps: 5 });
  await page.mouse.click(cx, cy - 20);

  const distance = page.getByTestId("extrude-distance-input");
  await expect(distance).toBeVisible({ timeout: 10_000 });

  // Commit the first extrude: type a distance and press Enter.
  await distance.fill("0.6");
  await distance.press("Enter");
  await firstPlace;

  // After the commit the result mesh is selected. Click one of ITS faces — with no
  // tool re-armed — and the distance input must appear again. This is the regression
  // the fix targets ("the new geometry cannot be edited").
  const secondPlace = page.waitForRequest(placeMeshRequest(id), { timeout: 15_000 });

  await page.mouse.move(cx, cy - 30, { steps: 5 });
  await page.mouse.click(cx, cy - 30);

  const distance2 = page.getByTestId("extrude-distance-input");
  await expect(distance2).toBeVisible({ timeout: 10_000 });

  await distance2.fill("0.6");
  await distance2.press("Enter");
  await secondPlace;
});
