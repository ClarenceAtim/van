import { expect, test } from "@playwright/test";

/**
 * Full order request: add to cart → single-page checkout as a guest → confirmation page →
 * the admin sends the order confirmation (shipping + payment details) and marks it paid.
 *
 * Needs a running site with the database, Turnstile test keys (or none), and an admin account:
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npm run test:e2e -- purchase
 */
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the order test");

test("guest places an order request and the admin confirms it and marks it paid", async ({ page }) => {
  test.setTimeout(180_000);
  const email = `e2e+${Date.now()}@example.com`;

  await page.goto("/shop/care-accessories/digital-thermometer-hygrometer");
  await page.waitForLoadState("networkidle");
  await Promise.all([page.waitForResponse((r) => r.url().endsWith("/api/cart") && r.request().method() === "POST"), page.getByRole("button", { name: "Add to cart" }).click()]);
  await page.goto("/checkout");

  // Empty submit: inline errors, focus moves to the first one
  await page.getByRole("button", { name: "Place Order" }).click();
  await expect(page.getByText("Enter your full name")).toBeVisible();
  await expect(page.locator("#co-fullName")).toBeFocused();

  await page.locator("#co-fullName").fill("E2E Tester");
  await page.locator("#co-email").fill(email);
  await page.locator("#co-phone").fill("+1 512 555 0134");
  await page.locator("#co-country").selectOption("US");
  await page.locator("#co-region").selectOption("TX");
  await page.locator("#co-city").fill("Austin");
  await page.locator("#co-address").fill("1200 Riverbend Rd");
  await page.locator("#co-postalCode").fill("78701");
  await page.getByLabel(/Zelle/).check();

  // Form survives a refresh
  await page.reload();
  await expect(page.locator("#co-city")).toHaveValue("Austin");
  await expect(page.getByLabel(/Zelle/)).toBeChecked();

  await page.getByRole("button", { name: "Place Order" }).click();
  await page.waitForURL(/\/checkout\/confirmation\/SH-\d+/, { timeout: 60_000 });
  await expect(page.getByText(/We'll email you within 24 hours with your shipping cost and payment details/)).toBeVisible();
  const orderNumber = page.url().match(/SH-\d+/)![0];

  // Admin: confirm with shipping, then mark paid
  await page.goto("/login?next=/admin/orders");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/orders/);
  await page.getByRole("link", { name: orderNumber }).click();
  await page.getByLabel("Shipping cost").fill("9.95");
  await page.getByRole("button", { name: "Fill in confirmation email" }).click();
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Send confirmation to customer" }).click();
  await expect(page.getByText(/Order confirmation sent|Status updated/)).toBeVisible();
  await page.reload();
  page.once("dialog", (d) => void d.accept());
  await page.getByLabel(/Payment reference/).fill("E2E-REF");
  await page.getByRole("button", { name: "Mark as paid" }).click();
  await expect(page.getByText("Order marked as paid.")).toBeVisible();
});
