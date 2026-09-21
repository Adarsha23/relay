import { test, expect } from "@playwright/test";

test("realtime sync and presence across two clients", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  await a.goto("/");
  await b.goto("/");
  await expect(a.getByRole("heading", { name: "All issues" })).toBeVisible();
  await expect(b.getByRole("heading", { name: "All issues" })).toBeVisible();

  // Presence: within a few heartbeats each client sees at least 2 online (self + the other).
  const onlineCount = (page: typeof a) =>
    page.locator("[data-online-count]").getAttribute("data-online-count").then(Number);
  await expect.poll(() => onlineCount(a), { timeout: 20000 }).toBeGreaterThanOrEqual(2);
  await expect.poll(() => onlineCount(b), { timeout: 20000 }).toBeGreaterThanOrEqual(2);

  // An edit in A shows up in B with no reload.
  const title = `Cross-client sync ${Date.now()}`;
  await a.keyboard.press("c");
  const dialog = a.getByRole("dialog");
  await dialog.getByPlaceholder("Issue title").fill(title);
  await dialog.getByRole("button", { name: "Create issue" }).click();
  await expect(a.getByText(title)).toBeVisible();
  await expect(b.getByText(title)).toBeVisible({ timeout: 10000 });

  await ctxA.close();
  await ctxB.close();
});
