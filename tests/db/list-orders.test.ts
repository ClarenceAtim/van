/**
 * listOrders backs the /admin dashboard and /admin/orders. Postgres rejects a query that is
 * sent more parameters than its SQL uses ("could not determine data type of parameter $1"),
 * so both branches (all orders, and filtered by status) must run against a real database.
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as orders from "@/lib/db/orders";
import type { Queryable } from "@/lib/db/types";

let q: Queryable;

const order = (email: string): orders.NewOrder => ({
  user_id: null,
  email,
  subtotal_cents: 1000,
  shipping_cents: 0,
  tax_cents: 0,
  total_cents: 1000,
  currency: "USD",
  shipping_method: "standard",
  shipping_address: {},
  contains_live_animals: false,
  live_animal_ack_at: null,
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
  const pending = await orders.createPendingOrder(q, order("pending@example.com"), line);
  const paid = await orders.createPendingOrder(q, order("paid@example.com"), line);
  const shipped = await orders.createPendingOrder(q, order("shipped@example.com"), line);
  await pg.query("update orders set status = 'paid' where id = $1", [paid.id]);
  await pg.query("update orders set status = 'shipped' where id = $1", [shipped.id]);
  expect(pending.id).toBeTruthy();
});

describe("listOrders", () => {
  it("lists every non-pending order when status is null", async () => {
    const list = await orders.listOrders(q, null);
    expect(list.map((o) => o.email).sort()).toEqual(["paid@example.com", "shipped@example.com"]);
  });

  it("filters by status", async () => {
    const list = await orders.listOrders(q, "paid");
    expect(list.map((o) => o.email)).toEqual(["paid@example.com"]);
  });

  it("applies the limit in both branches", async () => {
    expect(await orders.listOrders(q, null, 1)).toHaveLength(1);
    expect(await orders.listOrders(q, "shipped", 1)).toHaveLength(1);
  });
});
