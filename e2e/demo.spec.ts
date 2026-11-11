import { expect, test } from "@playwright/test";

// No wallet extension exists in the test browser, so the app must default to demo mode.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("demo-note")).toBeVisible();
  await expect(page.getByTestId("activity-row").first()).toBeVisible();
});

test("visitors without Phantom land in demo mode with devnet safety cues", async ({ page }) => {
  await expect(page.getByRole("switch", { name: "Try demo" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByTestId("devnet-badge")).toHaveText("Devnet");
  await expect(page.getByTestId("wallet-button")).toContainText("Demo wallet");
  await expect(page.getByText("≈ test funds, no real money")).toBeVisible();
  await expect(page.getByTestId("balance")).toHaveText("12.48 SOL");

  const rows = page.getByTestId("activity-row");
  await expect(rows).toHaveCount(6);
  await expect(rows.nth(0)).toContainText("Received");
  await expect(rows.nth(0)).toContainText("2.00 SOL");
  await expect(rows.nth(2)).toContainText("Signed message");
  await expect(rows.nth(3)).toContainText("Airdrop");
  await expect(page.getByText("Mock AI")).toBeVisible();
});

test("clicking an activity row asks the copilot to explain it", async ({ page }) => {
  await page.getByTestId("activity-row").nth(1).click();
  await expect(page.getByTestId("copilot-selected")).toContainText("Sent 0.50 SOL");
  await expect(page.getByTestId("message-user").last()).toHaveText(/What was this transaction\?/);
  const reply = page.getByTestId("message-assistant").last();
  await expect(reply).toContainText("You sent 0.50 SOL to");
  await expect(reply).toContainText("Fee: 0.000005 SOL, paid by you.");
  await expect(reply).toContainText("Status: finalized");
});

test("free-form questions use the wallet context", async ({ page }) => {
  const input = page.getByLabel("Message the copilot", { exact: true });
  await input.fill("What's my balance?");
  await input.press("Enter");
  await expect(page.getByTestId("message-assistant").last()).toContainText("12.48 SOL");
});

test("send validates, confirms and shows the signature", async ({ page }) => {
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const form = page.getByTestId("send-form");
  await form.getByRole("button", { name: "Review" }).click();
  await expect(form.getByText("Enter a recipient address.")).toBeVisible();

  await form.getByLabel("Recipient address").fill("not-an-address");
  await form.getByLabel("Amount (SOL)").fill("99");
  await form.getByRole("button", { name: "Review" }).click();
  await expect(form.getByText("That isn't a valid Solana address.")).toBeVisible();
  await expect(form.getByText(/Not enough test SOL/)).toBeVisible();
  await expect(form.getByLabel("Recipient address")).toHaveAttribute("aria-invalid", "true");

  await form.getByLabel("Recipient address").fill("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
  await form.getByLabel("Amount (SOL)").fill("0.25");
  await form.getByRole("button", { name: "Review" }).click();
  await expect(page.getByTestId("send-review")).toContainText("0.25 SOL");
  await page.getByRole("button", { name: "Confirm send" }).click();

  await expect(page.getByTestId("send-status")).toContainText("Sent 0.25 SOL to 9xQe…VFin");
  await expect(page.getByTestId("send-status")).toContainText("demo, not on chain");
  await expect(page.getByTestId("balance")).toHaveText("12.23 SOL");
  await expect(page.getByTestId("activity-row").first()).toContainText("0.25 SOL");
});

test("airdrop adds 1 SOL, then the faucet rate limit is handled gracefully", async ({ page }) => {
  const airdrop = page.getByRole("button", { name: "Airdrop", exact: true });
  await airdrop.click();
  await expect(page.getByTestId("airdrop-status")).toContainText("+1 SOL airdropped");
  await expect(page.getByTestId("balance")).toHaveText("13.48 SOL");

  await airdrop.click();
  await expect(page.getByTestId("airdrop-status")).toContainText("rate-limited");
  await expect(page.getByRole("link", { name: "Open faucet" })).toHaveAttribute(
    "href",
    "https://faucet.solana.com",
  );
});

test("sign message verifies and lands in activity", async ({ page }) => {
  await page.getByRole("button", { name: "Sign message" }).click();
  await expect(page.getByTestId("sign-status")).toContainText("verified with your public key");
  await expect(page.getByTestId("activity-row").first()).toContainText("Signed message");
  await page.getByTestId("activity-row").first().click();
  await expect(page.getByTestId("message-assistant").last()).toContainText("no fee was paid");
});

test("turning demo off without Phantom offers to install it", async ({ page }) => {
  await page.getByRole("switch", { name: "Try demo" }).click();
  await expect(page.getByRole("link", { name: /Install Phantom/ })).toBeVisible();
  await expect(page.getByText("Phantom isn't installed in this browser.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Airdrop", exact: true })).toBeDisabled();
});

test("mobile layout stacks the columns", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const balance = await page.getByRole("heading", { name: "Balance" }).boundingBox();
  const activity = await page.getByRole("heading", { name: "Recent activity" }).boundingBox();
  const copilot = await page.getByTestId("copilot").boundingBox();
  expect(balance!.y).toBeLessThan(activity!.y);
  expect(activity!.y).toBeLessThan(copilot!.y);
});
