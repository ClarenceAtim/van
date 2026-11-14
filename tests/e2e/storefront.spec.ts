import { expect, test } from "@playwright/test";

test.describe("storefront", () => {
  test("home page shows hero, featured animals and categories", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Featured animals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
  });

  test("category page lists products with prices and filters work", async ({ page }) => {
    await page.goto("/shop/live-reptiles");
    await expect(page.getByRole("heading", { level: 1, name: "Live Reptiles" })).toBeVisible();
    await expect(page.getByText(/\d+ products/)).toBeVisible();
    const cards = page.locator("main article");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(12);

    await page.getByRole("combobox", { name: "Sort by" }).selectOption("price-asc");
    await expect(page).toHaveURL(/sort=price-asc/);
    const prices = await cards.locator("span.text-lg").allTextContents();
    const values = prices.map((p) => Number(p.replace(/[^0-9.]/g, "")));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  test("product page shows price, stock, care sheet and Product JSON-LD", async ({ page }) => {
    await page.goto("/shop/live-reptiles/piebald-ball-python");
    await expect(page.getByRole("heading", { level: 1, name: "Ball Python – Piebald" })).toBeVisible();
    await expect(page.getByText("$399.00").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Care sheet" })).toBeVisible();
    await expect(page.getByText(/Photo:/)).toHaveCount(0);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const product = ld.map((s) => JSON.parse(s)).find((d) => d["@type"] === "Product");
    expect(product.offers.price).toBe("399.00");
    expect(product.offers.availability).toBe("https://schema.org/InStock");
  });

  test("instant search finds products", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("combobox", { name: "Search products" }).first();
    await box.fill("leopard gecko");
    const option = page.getByRole("option").filter({ hasText: "Leopard Gecko" }).first();
    await expect(option).toBeVisible();
    await option.click();
    await expect(page).toHaveURL(/\/shop\//);
  });

  test("add to cart, change quantity and reach checkout", async ({ page }) => {
    await page.goto("/shop/heating-lighting/t5-ho-uvb-12-34in");
    await page.getByRole("button", { name: "Add to cart" }).click();
    const drawer = page.getByRole("dialog", { name: "Your cart" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("T5 HO UVB 12% Tube – 34 in")).toBeVisible();
    await expect(drawer.getByText("$69.00").first()).toBeVisible();

    await drawer.getByRole("link", { name: "View full cart" }).click();
    await expect(page).toHaveURL("/cart");
    await page.getByRole("main").getByRole("button", { name: "Increase quantity of T5 HO UVB 12% Tube – 34 in" }).click();
    await expect(page.getByText("$138.00").first()).toBeVisible();
    // Shipping is confirmed by email — the summary says so, there is no free-shipping line.
    await expect(page.locator('aside[aria-label="Order summary"]').getByText("Confirmed before you pay", { exact: true })).toBeVisible();
    await expect(page.locator('aside[aria-label="Order summary"]').getByText("Shipping depends on your country and is confirmed by email before you pay.")).toBeVisible();

    await page.getByRole("link", { name: "Continue to checkout" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
    await expect(page.getByLabel("Shipping address")).toBeVisible();
    // No live animals → no age/policy checkbox
    await expect(page.getByText("Live animal policy")).toHaveCount(0);
  });

  test("live animals require the 18+ policy checkbox and overnight shipping", async ({ page }) => {
    await page.goto("/shop/live-reptiles/leopard-gecko-normal");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("dialog", { name: "Your cart" })).toBeVisible();
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Live animal delivery" })).toBeVisible();
    await expect(page.getByText("Live animals ship overnight.")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /I am 18 or older/ })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /I agree to the Live Animal Policy/ })).toBeVisible();
  });

  test("static pages and care guides render", async ({ page }) => {
    for (const [path, heading] of [
      ["/live-arrival-guarantee", "Live Arrival Guarantee"],
      ["/faq", "Frequently asked questions"],
      // /care-guides 308-redirects to the blog category page, whose h1 is "Care Guides".
      ["/care-guides", "Care Guides"],
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }
  });
});
