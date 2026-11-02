/**
 * Runs every migration in db/migrations on an in-memory Postgres (PGlite) and checks
 * the authorization rules of the data layer the app uses (src/lib/db): customers only
 * ever reach their own rows, cannot promote themselves, and only buyers can review.
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as account from "@/lib/db/account";
import * as carts from "@/lib/db/carts";
import * as catalog from "@/lib/db/catalog";
import { rateLimitHit } from "@/lib/db/inbox";
import * as orders from "@/lib/db/orders";
import type { Queryable } from "@/lib/db/types";

const ALICE = "user_alice";
const BOB = "user_bob";
let pg: PGlite;
let q: Queryable;
let geckoId: string;
let aliceOrderId: string;

beforeAll(async () => {
  pg = new PGlite();
  q = pg as unknown as Queryable;
  const dir = path.resolve(import.meta.dirname, "../../db/migrations");
  for (const file of fs.readdirSync(dir).sort()) await pg.exec(fs.readFileSync(path.join(dir, file), "utf8"));
  await pg.exec(`insert into categories (slug, name) values ('live-reptiles', 'Live Reptiles')`);
  geckoId = (
    await pg.query<{ id: string }>(
      `insert into products (slug, name, category, short_description, long_description, price_cents, stock_quantity, sku, tags)
       values ('test-gecko', 'Test Gecko', 'live-reptiles', 'A calm leopard gecko', 'Long text about geckos', 4900, 5, 'TEST-1', '{gecko}') returning id`,
    )
  ).rows[0].id;
  await pg.exec(`insert into products (slug, name, category, short_description, long_description, price_cents, stock_quantity, sku, active)
                 values ('hidden-item', 'Hidden', 'live-reptiles', 's', 'l', 100, 1, 'TEST-2', false)`);
  const order = await orders.createOrder(
    q,
    {
      user_id: ALICE,
      email: "alice@example.com",
      customer_name: "Alice",
      phone: "+1 512 555 0134",
      whatsapp: null,
      subtotal_cents: 9800,
      shipping_cents: 4999,
      tax_cents: 0,
      total_cents: 14799,
      currency: "USD",
      shipping_method: "live-overnight",
      shipping_address: { name: "Alice", line1: "1 Main St", city: "Austin", state: "TX", postal_code: "78701", country: "US" },
      delivery_notes: null,
      preferred_delivery_date: null,
      contains_live_animals: true,
      live_animal_ack_at: new Date().toISOString(),
      payment_method: "zelle",
      terms_accepted_at: new Date().toISOString(),
      cart_id: null,
    },
    [{ product_id: geckoId, product_slug: "test-gecko", product_name: "Test Gecko", sku: "TEST-1", unit_price_cents: 4900, quantity: 2, is_live_animal: true }],
  );
  aliceOrderId = order.id;
  await account.saveAddress(q, ALICE, { full_name: "Alice", line1: "1 Main St", city: "Austin", region: "TX", postal_code: "78701", is_default: true });
});

describe("catalog", () => {
  it("lists only active products, with images as JSON", async () => {
    const products = await catalog.listActiveProducts<{ slug: string; images: unknown[] }>(q);
    expect(products.map((p) => p.slug)).toEqual(["test-gecko"]);
    expect(products[0].images).toEqual([]);
  });

  it("full-text search finds products by name, tag and description", async () => {
    expect(await catalog.searchProductSlugs(q, "gecko", 5)).toEqual(["test-gecko"]);
    expect(await catalog.searchProductSlugs(q, "hidden", 5)).toEqual([]);
  });
});

describe("customer data isolation", () => {
  it("users see only their own orders", async () => {
    expect(await orders.listOrdersForUser(q, BOB)).toHaveLength(0);
    expect(await orders.getOrderForUser(q, BOB, aliceOrderId)).toBeNull();
    expect(await orders.listOrdersForUser(q, ALICE)).toHaveLength(1);
  });

  it("users see and change only their own addresses", async () => {
    expect(await account.listAddresses(q, BOB)).toHaveLength(0);
    const [aliceAddress] = await account.listAddresses(q, ALICE);
    const hijack = await account.saveAddress(q, BOB, { full_name: "Bob", line1: "x", city: "y", region: "TX", postal_code: "78701", is_default: false }, aliceAddress.id);
    expect(hijack).toBe(false);
    await account.deleteAddress(q, BOB, aliceAddress.id);
    expect(await account.listAddresses(q, ALICE)).toHaveLength(1);
  });

  it("profiles are created as customers and cannot self-promote", async () => {
    const p = await account.ensureProfile(q, { id: ALICE, email: "alice@example.com", name: "Alice" });
    expect(p.role).toBe("customer");
    await account.updateProfile(q, ALICE, { full_name: "Alice A" });
    // ensureProfile on later sign-ins never touches the role, even for admins
    await pg.exec(`update profiles set role = 'admin' where id = '${ALICE}'`);
    expect((await account.ensureProfile(q, { id: ALICE, email: "alice@example.com" })).role).toBe("admin");
    expect((await account.ensureProfile(q, { id: BOB, email: "bob@example.com" })).role).toBe("customer");
  });

  it("wishlists are per user", async () => {
    expect(await account.toggleWishlist(q, BOB, geckoId)).toBe("added");
    expect(await account.wishlistSlugs(q, ALICE)).toHaveLength(0);
    expect(await account.toggleWishlist(q, BOB, geckoId)).toBe("removed");
  });
});

describe("carts", () => {
  it("guest carts merge into the user cart on sign-in", async () => {
    const guest = await carts.createGuestCart(q);
    await carts.setCartItem(q, guest, "test-gecko", 2);
    await carts.mergeGuestCart(q, guest, BOB);
    const bobCart = (await carts.userCartId(q, BOB, false))!;
    expect(await carts.cartEntries(q, bobCart)).toEqual([{ slug: "test-gecko", quantity: 2 }]);
    expect(await carts.guestCartExists(q, guest)).toBe(false);
  });

  it("a user cart can't be reached as a guest cart", async () => {
    const bobCart = (await carts.userCartId(q, BOB, false))!;
    expect(await carts.guestCartExists(q, bobCart)).toBe(false);
  });
});

describe("orders and reviews", () => {
  it("non-buyers cannot review", async () => {
    expect(await account.submitReview(q, BOB, { productId: geckoId, authorName: "Bob", rating: 5, title: "Great", body: "Nice gecko indeed" })).toBe("not-purchased");
  });

  it("placing an order reserves stock; marking paid works once", async () => {
    expect((await catalog.liveStock(q, ["test-gecko"])).get("test-gecko")).toBe(3);
    expect(await orders.markPaid(q, aliceOrderId, "zelle-123")).toBe(true);
    expect(await orders.markPaid(q, aliceOrderId, "zelle-123")).toBe(false);
    expect((await catalog.liveStock(q, ["test-gecko"])).get("test-gecko")).toBe(3);
    const order = (await orders.getOrderForUser(q, ALICE, aliceOrderId))!;
    expect(order.status).toBe("paid");
    expect(order.payment_reference).toBe("zelle-123");
    expect(order.shipping_address).toMatchObject({ state: "TX" });
    expect(order.order_items).toHaveLength(1);
  });

  it("verified buyers can review once; reviews start pending", async () => {
    const review = { productId: geckoId, authorName: "Alice", rating: 5, title: "Great", body: "Healthy gecko arrived" };
    expect(await account.submitReview(q, ALICE, review)).toBe("created");
    expect(await account.submitReview(q, ALICE, review)).toBe("duplicate");
    expect(await catalog.approvedReviews(q, geckoId)).toHaveLength(0);
    await pg.exec(`update reviews set status = 'approved'`);
    expect(await catalog.approvedReviews(q, geckoId)).toHaveLength(1);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit within a window", async () => {
    const hits: boolean[] = [];
    for (let i = 0; i < 4; i++) hits.push(await rateLimitHit(q, "test", 3, 60));
    expect(hits).toEqual([true, true, true, false]);
  });
});
