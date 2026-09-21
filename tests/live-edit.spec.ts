import { test, expect } from "@playwright/test";

test("live text sync and editing indicator across two clients", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  await a.goto("/");
  await b.goto("/");
  await expect(a.getByText(/^REL-/).first()).toBeVisible();
  await expect(b.getByText(/^REL-/).first()).toBeVisible();

  // A creates its own target issue so the test doesn't depend on seed data.
  const original = `Live edit target ${Date.now()}`;
  await a.keyboard.press("c");
  const dialog = a.getByRole("dialog");
  await dialog.getByPlaceholder("Issue title").fill(original);
  await dialog.getByRole("button", { name: "Create issue" }).click();
  await expect(a.getByText(original)).toBeVisible();
  await expect(b.getByText(original)).toBeVisible({ timeout: 10000 });

  // Both open the same issue.
  await a.getByText(original).click();
  await b.getByText(original).click();

  // A types in the title (no blur). B should see the "editing" indicator and the live text.
  const aTitle = a.getByRole("complementary").getByPlaceholder("Issue title");
  const newTitle = `Live edited ${Date.now()}`;
  await aTitle.fill(newTitle);

  await expect(b.getByText(/is editing/i)).toBeVisible({ timeout: 10000 });

  const bTitle = b.getByRole("complementary").getByPlaceholder("Issue title");
  await expect(bTitle).toHaveValue(newTitle, { timeout: 10000 });

  await ctxA.close();
  await ctxB.close();
});
