import { test, expect } from "@playwright/test";

test("create, keyboard-select, command palette, optimistic status change", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "All issues" })).toBeVisible();
  // Wait for client hydration (issues loaded) before using keyboard shortcuts.
  await expect(page.getByText(/^REL-/).first()).toBeVisible();

  // Create via the keyboard shortcut.
  const title = `Playwright issue ${Date.now()}`;
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("Issue title").fill(title);
  await dialog.getByRole("button", { name: "Create issue" }).click();
  await expect(page.getByText(title)).toBeVisible();
  // Wait for the dialog (and its focused input) to fully unmount before keyboard nav.
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Keyboard selection opens the detail panel.
  await page.keyboard.press("j");
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

  // Command palette opens on Cmd/Ctrl+K.
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder(/search issues/i)).toBeVisible();
  await page.keyboard.press("Escape");

  // Optimistic status change via the detail panel: select our new issue, flip to In Progress.
  await page.getByText(title).click();
  const detail = page.getByRole("complementary");
  await detail.getByRole("button", { name: /^Status:/ }).click();
  await page.getByRole("menuitem", { name: "In Progress" }).click();
  await expect(detail.getByText("In Progress")).toBeVisible();
});
