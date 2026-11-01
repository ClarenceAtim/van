import { expect, test } from "@playwright/test";

/**
 * Full purchase in Stripe TEST mode: browse → add to cart → pay on Stripe Checkout
 * with the 4242 test card → order appears in /admin.
 *
 * Needs a deployed (or locally running) site with Supabase + Stripe test keys, the
 * Stripe webhook forwarding to it (`stripe listen --forward-to localhost:3000/api/stripe/webhook`),
 * Turnstile disabled or using Cloudflare's test keys, and an admin account:
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npm run test:e2e -- purchase
 */
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (and Stripe/Supabase test keys) to run the purchase test");

test("guest buys a product with a Stripe test card and the order shows in admin", async ({ page }) => {
  test.setTimeout(180_000);
  const email = `e2e+${Date.now()}@example.com`;

  await page.goto("/shop/care-accessories/digital-thermometer-hygrometer");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/checkout");
  await page.getByLabel("Email for your order confirmation").fill(email);
  await page.getByLabel("Shipping state").selectOption("TX");
  await page.getByRole("button", { name: /Continue to secure payment/ }).click();

  // Stripe hosted checkout
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByLabel("Expiration").fill("12 / 34");
  await page.getByLabel("CVC").fill("123");
  await page.getByLabel(/Cardholder name|Full name/).first().fill("E2E Tester");
  await page.getByLabel("Address line 1").fill("1200 Riverbend Rd");
  await page.getByLabel("City").fill("Austin");
  await page.getByLabel("ZIP").fill("78701");
  await page.getByRole("button", { name: /Pay/ }).click();

  await page.waitForURL(/\/checkout\/success/, { timeout: 90_000 });
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  const orderNumber = (await page.getByText(/SH-\d+/).first().textContent())!.match(/SH-\d+/)![0];

  // Admin sees the paid order
  await page.goto("/login?next=/admin/orders");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/orders/);
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("link", { name: orderNumber })).toBeVisible();
  }).toPass({ timeout: 60_000 });
  await page.getByRole("link", { name: orderNumber }).click();
  await expect(page.getByText("paid", { exact: true }).first()).toBeVisible();
});
