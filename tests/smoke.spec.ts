import { test, expect } from "@playwright/test";

test("app loads with no runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });

  await page.goto("/");

  await expect(page.getByText("Relay")).toBeVisible();
  await expect(page.getByRole("heading", { name: "All issues" })).toBeVisible();

  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(12, 13, 16)"); // #0c0d10 canvas

  await page.waitForTimeout(1500);
  expect(errors, `unexpected browser errors:\n${errors.join("\n")}`).toEqual([]);
});
