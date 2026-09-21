import { test, expect } from "@playwright/test";

test("detail overlays the list on narrow viewports, sits beside it when wide", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 820 });
  await page.goto("/");
  await expect(page.getByText(/^REL-/).first()).toBeVisible();

  const title = `Responsive ${Date.now()}`;
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Issue title").fill(title);
  await dialog.getByRole("button", { name: "Create issue" }).click();
  await page.getByText(title).click();

  // Narrow: the detail is an overlay with a scrim.
  await expect(page.getByRole("complementary")).toBeVisible();
  await expect(page.getByTestId("detail-scrim")).toBeVisible();

  // Wide: side-by-side, no scrim.
  await page.setViewportSize({ width: 1440, height: 820 });
  await expect(page.getByRole("complementary")).toBeVisible();
  await expect(page.getByTestId("detail-scrim")).toBeHidden();
});
