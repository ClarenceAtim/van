/**
 * Applies every migration in supabase/migrations to an in-memory Postgres
 * (PGlite) and checks the Row Level Security rules as anon, customers and admins.
 */
import { PGlite, type Transaction } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const ADMIN = "00000000-0000-0000-0000-00000000000a";
const ALICE = "00000000-0000-0000-0000-0000000000a1";
const BOB = "00000000-0000-0000-0000-0000000000b0";

let db: PGlite;
let productId: string;
let aliceOrderId: string;

async function as<T>(role: "anon" | "authenticated" | "service_role", uid: string | null, fn: (tx: Transaction) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? ""]);
    await tx.exec(`set local role ${role}`);
    return fn(tx);
  });
}

async function rejects(p: Promise<unknown>) {
  await expect(p).rejects.toThrow();
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(fs.readFileSync(path.join(__dirname, "supabase-stub.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const file of fs.readdirSync(dir).sort()) {
    await db.exec(fs.readFileSync(path.join(dir, file), "utf8"));
  }

  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN}', 'admin@example.com'), ('${ALICE}', 'alice@example.com'), ('${BOB}', 'bob@example.com');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
    insert into public.categories (slug, name) values ('live-reptiles', 'Live Reptiles');
  `);
  const p = await db.query<{ id: string }>(`
    insert into public.products (slug, name, category, short_description, long_description, price_cents, stock_quantity, sku)
    values ('test-gecko', 'Test Gecko', 'live-reptiles', 'short', 'long', 4900, 5, 'TEST-1') returning id`);
  productId = p.rows[0].id;
  await db.exec(`
    insert into public.products (slug, name, category, short_description, long_description, price_cents, stock_quantity, sku, active)
    values ('hidden-item', 'Hidden', 'live-reptiles', 's', 'l', 100, 1, 'TEST-2', false);`);
  const o = await db.query<{ id: string }>(`
    insert into public.orders (user_id, email, subtotal_cents, shipping_cents, total_cents, shipping_method)
    values ('${ALICE}', 'alice@example.com', 9800, 0, 9800, 'standard') returning id`);
  aliceOrderId = o.rows[0].id;
  await db.query(
    `insert into public.order_items (order_id, product_id, product_slug, product_name, sku, unit_price_cents, quantity, line_total_cents)
     values ($1, $2, 'test-gecko', 'Test Gecko', 'TEST-1', 4900, 2, 9800)`,
    [aliceOrderId, productId],
  );
  await db.exec(`
    insert into public.addresses (user_id, full_name, line1, city, region, postal_code)
    values ('${ALICE}', 'Alice', '1 Main St', 'Austin', 'TX', '78701');
    insert into public.contact_messages (name, email, subject, message) values ('X', 'x@example.com', 'Hi', 'Hello');`);
});

describe("catalog", () => {
  it("anon reads active products only", async () => {
    const rows = await as("anon", null, (tx) => tx.query<{ slug: string }>("select slug from public.products"));
    expect(rows.rows.map((r) => r.slug)).toEqual(["test-gecko"]);
  });

  it("customers cannot change products", async () => {
    await as("authenticated", ALICE, async (tx) => {
      const r = await tx.query(`update public.products set price_cents = 1 where slug = 'test-gecko'`);
      expect(r.affectedRows).toBe(0);
    });
    await rejects(
      as("authenticated", ALICE, (tx) =>
        tx.query(`insert into public.products (slug, name, category, short_description, long_description, price_cents, sku)
                  values ('x', 'x', 'live-reptiles', 's', 'l', 1, 'X-1')`),
      ),
    );
  });

  it("admins can change products and see inactive ones", async () => {
    await as("authenticated", ADMIN, async (tx) => {
      const r = await tx.query(`update public.products set featured = true where slug = 'test-gecko'`);
      expect(r.affectedRows).toBe(1);
      const all = await tx.query("select slug from public.products");
      expect(all.rows).toHaveLength(2);
    });
  });
});

describe("customer data isolation", () => {
  it("users see only their own orders and order items", async () => {
    const bob = await as("authenticated", BOB, async (tx) => ({
      orders: (await tx.query("select id from public.orders")).rows,
      items: (await tx.query("select id from public.order_items")).rows,
    }));
    expect(bob.orders).toHaveLength(0);
    expect(bob.items).toHaveLength(0);
    const alice = await as("authenticated", ALICE, (tx) => tx.query("select id from public.orders"));
    expect(alice.rows).toHaveLength(1);
  });

  it("users see only their own addresses", async () => {
    const bob = await as("authenticated", BOB, (tx) => tx.query("select id from public.addresses"));
    expect(bob.rows).toHaveLength(0);
  });

  it("customers cannot change order status", async () => {
    const r = await as("authenticated", ALICE, (tx) =>
      tx.query(`update public.orders set status = 'shipped' where id = $1`, [aliceOrderId]),
    );
    expect(r.affectedRows).toBe(0);
  });

  it("customers cannot promote themselves to admin", async () => {
    await rejects(
      as("authenticated", ALICE, (tx) => tx.query(`update public.profiles set role = 'admin' where id = $1`, [ALICE])),
    );
    const r = await as("authenticated", ALICE, (tx) =>
      tx.query(`update public.profiles set full_name = 'Alice A' where id = $1`, [ALICE]),
    );
    expect(r.affectedRows).toBe(1);
  });

  it("customers cannot read another user's profile", async () => {
    const r = await as("authenticated", BOB, (tx) => tx.query(`select id from public.profiles where id = $1`, [ALICE]));
    expect(r.rows).toHaveLength(0);
  });

  it("anon cannot read contact messages or carts", async () => {
    const r = await as("anon", null, (tx) => tx.query("select id from public.contact_messages"));
    expect(r.rows).toHaveLength(0);
  });

  it("only the service role can fulfill orders", async () => {
    await rejects(as("authenticated", ALICE, (tx) => tx.query(`select public.fulfill_order($1, 'pi_x')`, [aliceOrderId])));
  });
});

describe("orders and reviews", () => {
  it("non-buyers cannot review", async () => {
    await rejects(
      as("authenticated", BOB, (tx) =>
        tx.query(
          `insert into public.reviews (product_id, user_id, author_name, rating, title, body) values ($1, $2, 'Bob', 5, 'Great', 'Nice')`,
          [productId, BOB],
        ),
      ),
    );
  });

  it("fulfill_order marks paid, decrements stock and is idempotent", async () => {
    const first = await as("service_role", null, (tx) =>
      tx.query<{ fulfill_order: boolean }>(`select public.fulfill_order($1, 'pi_1')`, [aliceOrderId]),
    );
    const second = await as("service_role", null, (tx) =>
      tx.query<{ fulfill_order: boolean }>(`select public.fulfill_order($1, 'pi_1')`, [aliceOrderId]),
    );
    expect(first.rows[0].fulfill_order).toBe(true);
    expect(second.rows[0].fulfill_order).toBe(false);
    const stock = await db.query<{ stock_quantity: number }>(`select stock_quantity from public.products where id = $1`, [productId]);
    expect(stock.rows[0].stock_quantity).toBe(3);
  });

  it("verified buyers can submit a pending review that others cannot see until approved", async () => {
    await as("authenticated", ALICE, (tx) =>
      tx.query(
        `insert into public.reviews (product_id, user_id, author_name, rating, title, body) values ($1, $2, 'Alice', 5, 'Great', 'Healthy gecko')`,
        [productId, ALICE],
      ),
    );
    const hidden = await as("anon", null, (tx) => tx.query("select id from public.reviews"));
    expect(hidden.rows).toHaveLength(0);
    await as("authenticated", ADMIN, (tx) => tx.query(`update public.reviews set status = 'approved'`));
    const visible = await as("anon", null, (tx) => tx.query("select id from public.reviews"));
    expect(visible.rows).toHaveLength(1);
  });

  it("buyers cannot self-approve reviews", async () => {
    const r = await as("authenticated", ALICE, (tx) => tx.query(`update public.reviews set status = 'approved'`));
    expect(r.affectedRows).toBe(0);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit within a window", async () => {
    const hits: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await as("service_role", null, (tx) =>
        tx.query<{ rate_limit_hit: boolean }>(`select public.rate_limit_hit('test', 3, 60)`),
      );
      hits.push(r.rows[0].rate_limit_hit);
    }
    expect(hits).toEqual([true, true, true, false]);
  });
});
