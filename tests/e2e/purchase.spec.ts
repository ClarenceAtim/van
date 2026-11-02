import { expect, test } from "@playwright/test";

/**
 * Full order request: add to cart → 4-step checkout as a guest → confirmation page →
 * the admin sees the new order, sends payment details and marks it paid.
 *
 * Needs a running site with the database, Turnstile test keys (or none), and an admin account:
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npm run test:e2e -- purchase
 */
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the order test");

test("guest places an order request and the admin sends payment details and marks it paid", async ({ page }) => {
  test.setTimeout(180_000);
  const email = `e2e+${Date.now()}@example.com`;

  await page.goto("/shop/care-accessories/digital-thermometer-hygrometer");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/checkout");

  // Step 1: errors show next to the fields
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Enter your full name")).toBeVisible();

  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Confirm email").fill(email);
  await page.getByLabel("Phone", { exact: true }).fill("+1 512 555 0134");
  await page.getByLabel("Street address").fill("1200 Riverbend Rd");
  await page.getByLabel("City").fill("Austin");
  await page.getByLabel("State", { exact: true }).selectOption("TX");
  await page.getByLabel("ZIP code").fill("78701");
  await page.getByRole("button", { name: "Continue" }).click();

  // Progress survives a refresh
  await expect(page.getByRole("heading", { name: /Delivery/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /Delivery/ })).toBeVisible();

  // Step 2
  await page.getByLabel(/Standard shipping|Free standard shipping/).check();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3
  await page.getByLabel(/Zelle/).check();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4
  await expect(page.getByText("1200 Riverbend Rd")).toBeVisible();
  await page.getByLabel(/I agree to the Terms of Service/).check();
  await page.getByRole("button", { name: "Place order" }).click();

  await page.waitForURL(/\/checkout\/confirmation\/SH-\d+/, { timeout: 60_000 });
  await expect(page.getByText(/Check your email: we.ll send payment details shortly/)).toBeVisible();
  const orderNumber = page.url().match(/SH-\d+/)![0];

  // Admin: new order is highlighted, payment details can be sent, then marked paid
  await page.goto("/login?next=/admin/orders");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/orders/);
  await page.getByRole("link", { name: orderNumber }).click();
  await page.getByRole("button", { name: "Send email to customer" }).click();
  await expect(page.getByText(/Payment details sent|Status updated/)).toBeVisible();
  await page.reload();
  page.once("dialog", (d) => void d.accept());
  await page.getByLabel(/Payment reference/).fill("E2E-REF");
  await page.getByRole("button", { name: "Mark as paid" }).click();
  await expect(page.getByText("Order marked as paid.")).toBeVisible();
});
