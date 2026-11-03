/**
 * listOrders backs the /admin dashboard and /admin/orders. Postgres rejects a query that is
 * sent more parameters than its SQL uses ("could not determine data type of parameter $1"),
 * so every filter combination must run against a real database.
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as orders from "@/lib/db/orders";
import type { Queryable } from "@/lib/db/types";

let q: Queryable;

const order = (email: string, payment_method: string): orders.NewOrder => ({
  user_id: null,
  email,
  customer_name: "Test Customer",
  phone: "+1 512 555 0134",
  company: null,
  subtotal_cents: 1000,
  tax_cents: 0,
  total_cents: 1000,
  currency: "USD",
  shipping_method: "standard",
  shipping_address: {},
  delivery_notes: null,
  preferred_delivery_date: null,
  contains_live_animals: false,
  live_animal_ack_at: null,
  payment_methods: [payment_method],
  payment_other: null,
  cart_id: null,
});

beforeAll(async () => {
  const pg = new PGlite();
  q = pg as unknown as Queryable;
  const dir = path.resolve(import.meta.dirname, "../../db/migrations");
  for (const file of fs.readdirSync(dir).sort()) await pg.exec(fs.readFileSync(path.join(dir, file), "utf8"));
  await pg.exec(`insert into categories (slug, name) values ('care-accessories', 'Care Accessories')`);
  const productId = (
    await pg.query<{ id: string }>(
      `insert into products (slug, name, category, short_description, long_description, price_cents, stock_quantity, sku)
       values ('test-scale', 'Test Scale', 'care-accessories', 'A digital scale', 'Long text', 1000, 10, 'TEST-SCALE') returning id`,
    )
  ).rows[0].id;
  const line: orders.NewOrderItem[] = [
    { product_id: productId, product_slug: "test-scale", product_name: "Test Scale", sku: "TEST-SCALE", unit_price_cents: 1000, quantity: 1, is_live_animal: false },
  ];
  const fresh = await orders.createOrder(q, order("new@example.com", "zelle"), line);
  const paid = await orders.createOrder(q, order("paid@example.com", "paypal"), line);
  const shipped = await orders.createOrder(q, order("shipped@example.com", "zelle"), line);
  await pg.query("update orders set status = 'paid' where id = $1", [paid.id]);
  await pg.query("update orders set status = 'shipped' where id = $1", [shipped.id]);
  expect(fresh.order_number).toMatch(/^SH-\d+$/);
});

describe("listOrders", () => {
  it("lists every order without filters", async () => {
    const list = await orders.listOrders(q);
    expect(list.map((o) => o.email).sort()).toEqual(["new@example.com", "paid@example.com", "shipped@example.com"]);
  });

  it("filters by status", async () => {
    expect((await orders.listOrders(q, { status: "paid" })).map((o) => o.email)).toEqual(["paid@example.com"]);
    expect((await orders.listOrders(q, { status: "awaiting_confirmation" })).map((o) => o.email)).toEqual(["new@example.com"]);
  });

  it("filters by payment method, alone and with a status", async () => {
    expect((await orders.listOrders(q, { paymentMethod: "zelle" })).map((o) => o.email).sort()).toEqual(["new@example.com", "shipped@example.com"]);
    expect((await orders.listOrders(q, { status: "shipped", paymentMethod: "zelle" })).map((o) => o.email)).toEqual(["shipped@example.com"]);
    expect(await orders.listOrders(q, { status: "paid", paymentMethod: "zelle" })).toHaveLength(0);
  });

  it("applies the limit with and without filters", async () => {
    expect(await orders.listOrders(q, {}, 1)).toHaveLength(1);
    expect(await orders.listOrders(q, { status: "shipped", paymentMethod: "zelle" }, 1)).toHaveLength(1);
  });
});
