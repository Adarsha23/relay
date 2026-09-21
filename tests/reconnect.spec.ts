import { test, expect, type WebSocketRoute } from "@playwright/test";

test("offline edit reconciles on reconnect, with an offline indicator", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  // A controllable proxy for A's Convex websocket. setOffline() doesn't sever loopback sockets,
  // so we intercept the socket and can genuinely drop/restore it.
  const net = { down: false };
  const live = new Set<WebSocketRoute>();
  await a.routeWebSocket(/\/sync/, (ws) => {
    if (net.down) {
      ws.close();
      return;
    }
    ws.connectToServer(); // auto-forwards frames both ways
    live.add(ws);
    ws.onClose(() => live.delete(ws));
  });

  await a.goto("/");
  await b.goto("/");
  await expect(a.getByText(/^REL-/).first()).toBeVisible();
  await expect(b.getByText(/^REL-/).first()).toBeVisible();

  // A creates a target issue (defaults to Backlog); B sees it live.
  const title = `Offline sync ${Date.now()}`;
  await a.keyboard.press("c");
  const dialog = a.getByRole("dialog");
  await dialog.getByPlaceholder("Issue title").fill(title);
  await dialog.getByRole("button", { name: "Create issue" }).click();
  await expect(a.getByText(title)).toBeVisible();
  await expect(b.getByText(title)).toBeVisible({ timeout: 10000 });

  await a.getByText(title).click();
  await b.getByText(title).click();
  const bDetail = b.getByRole("complementary");
  await expect(bDetail.getByText("Backlog")).toBeVisible();

  // Truly drop A's socket → indicator appears.
  net.down = true;
  for (const ws of live) ws.close();
  await expect(a.getByTestId("offline-indicator")).toBeVisible({ timeout: 15000 });

  // A edits status while disconnected — optimistic locally, queued in the client.
  const aDetail = a.getByRole("complementary");
  await aDetail.getByRole("button", { name: /^Status:/ }).click();
  await a.getByRole("menuitem", { name: "Done" }).click();
  await expect(aDetail.getByText("Done")).toBeVisible();
  await expect(bDetail.getByText("Backlog")).toBeVisible(); // not on the server yet

  // Restore the socket → queued mutation flushes → B sees Done, indicator clears.
  net.down = false;
  await expect(a.getByTestId("offline-indicator")).toHaveCount(0, { timeout: 20000 });
  await expect(bDetail.getByText("Done")).toBeVisible({ timeout: 20000 });

  await ctxA.close();
  await ctxB.close();
});

test("optimistic update rolls back on server failure", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/^REL-/).first()).toBeVisible();

  const title = `Rollback target ${Date.now()}`;
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Issue title").fill(title);
  await dialog.getByRole("button", { name: "Create issue" }).click();
  await expect(page.getByText(title)).toBeVisible();

  await page.getByText(title).click();
  const detail = page.getByRole("complementary");
  await expect(detail.getByPlaceholder("Issue title")).toHaveValue(title);

  // A mutation that always fails; its optimistic patch renames the title to a sentinel.
  await page.getByTestId("debug-fail").click({ force: true });

  // Convex reverts the optimistic change — the sentinel must never stick.
  await expect(detail.getByPlaceholder("Issue title")).toHaveValue(title, { timeout: 5000 });
  await expect(page.getByText("__ROLLBACK__")).toHaveCount(0);
});
