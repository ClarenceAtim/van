import { expect, test } from "@playwright/test";

test.describe("security", () => {
  test("security headers are sent", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("signed-out visitors cannot reach /admin or /account", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
    await page.goto("/account/orders");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Forders/);
  });

  test("cart API rejects cross-site requests and ignores client prices", async ({ request }) => {
    const evil = await request.post("/api/cart", { headers: { Origin: "https://evil.example" }, data: { slug: "normal-ball-python", quantity: 1 } });
    expect(evil.status()).toBe(403);
    const ok = await request.post("/api/cart", { headers: { Origin: new URL(test.info().project.use.baseURL!).origin }, data: { slug: "normal-ball-python", quantity: 1, price_cents: 1 } });
    expect(ok.ok()).toBeTruthy();
    const cart = await ok.json();
    expect(cart.lines[0].unitPriceCents).toBe(7900);
  });

  test("webhook and revalidate endpoints reject unsigned requests", async ({ request }) => {
    expect((await request.post("/api/stripe/webhook", { data: {} })).status()).toBe(400);
    expect((await request.post("/api/revalidate")).status()).toBe(401);
  });
});
