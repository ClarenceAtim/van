/**
 * The order-request flow end to end, against an in-memory Postgres (PGlite) with every migration:
 * checkout (guest and signed in, with and without live animals), server-side price checks,
 * validation, the emails that go out, the admin actions, and the daily unpaid-order job.
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { placeOrderSchema, errorMap, type PlaceOrderInput } from "@/lib/checkout-schema";
import * as account from "@/lib/db/account";
import * as orders from "@/lib/db/orders";
import type { Queryable } from "@/lib/db/types";
import { setEmailTransport, type OutgoingEmail } from "@/lib/email";
import * as service from "@/lib/order-service";
import { liveDeliveryDates, type PricedLine } from "@/lib/pricing";

const NOW = new Date("2026-11-02T15:00:00Z"); // a Monday
const DAY = 86_400_000;
const OWNER = "owner@example.com";

let pg: PGlite;
let db: service.Db;
let sent: OutgoingEmail[] = [];
const products: Record<string, string> = {};

async function stock(slug: string) {
  return (await pg.query<{ stock_quantity: number }>("select stock_quantity from products where slug = $1", [slug])).rows[0].stock_quantity;
}

/** A cart line priced from the catalog, the way getCart() builds it. */
async function line(slug: string, quantity: number): Promise<PricedLine> {
  const p = (
    await pg.query<{ id: string; name: string; sku: string; price_cents: number; stock_quantity: number; is_live_animal: boolean }>(
      "select id, name, sku, price_cents, stock_quantity, is_live_animal from products where slug = $1",
      [slug],
    )
  ).rows[0];
  return { productId: p.id, slug, name: p.name, sku: p.sku, unitPriceCents: p.price_cents, quantity, stock: p.stock_quantity, isLiveAnimal: p.is_live_animal };
}

function input(over: { contact?: Partial<PlaceOrderInput["contact"]>; delivery?: Partial<PlaceOrderInput["delivery"]>; payment?: string; expectedTotalCents: number }): PlaceOrderInput {
  return {
    contact: {
      fullName: "Jamie Rivera",
      email: "jamie@example.com",
      confirmEmail: "jamie@example.com",
      phone: "+1 512 555 0134",
      whatsapp: "",
      country: "US",
      line1: "500 Congress Ave",
      line2: "Apt 4",
      city: "Austin",
      region: "TX",
      postalCode: "78701",
      deliveryNotes: "Leave at the front desk",
      saveAddress: false,
      ...over.contact,
    },
    delivery: { deliveryMethod: "standard", preferredDate: "", ageConfirmed: false, livePolicyAccepted: false, ...over.delivery },
    payment: { paymentMethod: over.payment ?? "zelle" },
    review: { termsAccepted: true, turnstileToken: null, expectedTotalCents: over.expectedTotalCents },
  };
}

async function place(i: PlaceOrderInput, lines: PricedLine[], userId: string | null = null) {
  return service.placeOrderRequest(db, { data: placeOrderSchema.parse(i), lines, userId, cartId: null, now: NOW });
}

beforeAll(async () => {
  process.env.ORDER_NOTIFICATION_EMAIL = OWNER;
  process.env.ORDER_REPLY_TO_EMAIL = "replies@example.com";
  pg = new PGlite();
  const q = pg as unknown as Queryable;
  db = { q, transaction: (fn) => pg.transaction((tx) => fn(tx as unknown as Queryable)) };
  const dir = path.resolve(import.meta.dirname, "../../db/migrations");
  for (const file of fs.readdirSync(dir).sort()) await pg.exec(fs.readFileSync(path.join(dir, file), "utf8"));
  await pg.exec(`insert into categories (slug, name) values ('live-reptiles', 'Live Reptiles'), ('care-accessories', 'Care Accessories')`);
  for (const [slug, name, category, price, qty, live] of [
    ["thermometer", "Digital Thermometer", "care-accessories", 1500, 100, false],
    ["leopard-gecko", "Leopard Gecko", "live-reptiles", 7900, 3, true],
  ] as const) {
    products[slug] = (
      await pg.query<{ id: string }>(
        `insert into products (slug, name, category, short_description, long_description, price_cents, stock_quantity, sku, is_live_animal)
         values ($1, $2, $3, 'short', 'long', $4, $5, upper($1), $6) returning id`,
        [slug, name, category, price, qty, live],
      )
    ).rows[0].id;
  }
  setEmailTransport(async (e) => {
    sent.push(e);
    return true;
  });
});

afterAll(() => setEmailTransport(null));
beforeEach(() => {
  sent = [];
});

describe("checkout", () => {
  it("guest checkout for supplies creates an order, reserves stock and sends both emails", async () => {
    const lines = [await line("thermometer", 2)]; // $30.00 + $9.99 standard
    const before = await stock("thermometer");
    const r = await place(input({ expectedTotalCents: 3999 }), lines);
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(r.orderNumber).toMatch(/^SH-\d{5,}$/);

    const order = (await orders.getOrder(db.q, r.orderId))!;
    expect(order).toMatchObject({
      status: "awaiting_payment_details",
      user_id: null,
      total_cents: 3999,
      shipping_cents: 999,
      shipping_method: "standard",
      payment_method: "zelle",
      customer_name: "Jamie Rivera",
      phone: "+1 512 555 0134",
      delivery_notes: "Leave at the front desk",
      stock_reserved: true,
    });
    expect(order.shipping_address).toMatchObject({ line1: "500 Congress Ave", line2: "Apt 4", state: "TX", country: "US" });
    expect(await stock("thermometer")).toBe(before - 2);

    expect(sent.map((e) => e.to).sort()).toEqual(["jamie@example.com", OWNER].sort());
    const customer = sent.find((e) => e.to === "jamie@example.com")!;
    expect(customer.subject).toContain(r.orderNumber);
    expect(customer.replyTo).toBe("replies@example.com");
    expect(customer.html).toContain("Zelle");
    const owner = sent.find((e) => e.to === OWNER)!;
    expect(owner.subject).toContain(r.orderNumber);
    expect(owner.html).toContain(`/admin/orders/${r.orderId}`);
    expect(owner.html).toContain("+1 512 555 0134");
  });

  it("free standard shipping applies over the threshold, and express is offered", async () => {
    const lines = [await line("thermometer", 7)]; // $105.00
    expect(await place(input({ expectedTotalCents: 10500, delivery: { deliveryMethod: "free-standard" } }), lines)).toMatchObject({ ok: true });
    expect(await place(input({ expectedTotalCents: 10500 + 2499, delivery: { deliveryMethod: "express" } }), lines)).toMatchObject({ ok: true });
    // "standard" isn't an option once shipping is free
    expect(await place(input({ expectedTotalCents: 10500 + 999 }), lines)).toMatchObject({ ok: false, step: "delivery" });
  });

  it("signed-in checkout links the order to the account and can save the address", async () => {
    const userId = "user_signed_in";
    const r = await place(input({ expectedTotalCents: 1500, delivery: { deliveryMethod: "pickup" }, contact: { saveAddress: true } }), [await line("thermometer", 1)], userId);
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect((await orders.getOrderForUser(db.q, userId, r.orderId))?.shipping_method).toBe("pickup");
    expect(await account.listAddresses(db.q, userId)).toMatchObject([{ line1: "500 Congress Ave", region: "TX", postal_code: "78701" }]);
  });

  it("live animals need overnight shipping, a valid weekday date and both confirmations", async () => {
    const lines = [await line("leopard-gecko", 1)];
    const total = 7900 + 4999;
    const date = liveDeliveryDates(NOW)[0];
    expect([2, 3, 4]).toContain(new Date(`${date}T12:00:00Z`).getUTCDay()); // delivered Tue–Thu

    expect(await place(input({ expectedTotalCents: 7900 + 999 }), lines)).toMatchObject({ ok: false, step: "delivery" });

    const missing = await place(input({ expectedTotalCents: total, delivery: { deliveryMethod: "live-overnight", preferredDate: "2026-11-07" } }), lines);
    expect(missing).toMatchObject({ ok: false, step: "delivery" });
    if (!missing.ok) expect(Object.keys(missing.errors ?? {}).sort()).toEqual(["ageConfirmed", "livePolicyAccepted", "preferredDate"]);

    const blocked = await place(
      input({ expectedTotalCents: total, contact: { region: "HI", postalCode: "96813" }, delivery: { deliveryMethod: "live-overnight", preferredDate: date, ageConfirmed: true, livePolicyAccepted: true } }),
      lines,
    );
    expect(blocked).toMatchObject({ ok: false, step: "delivery" });

    const before = await stock("leopard-gecko");
    const ok = await place(input({ expectedTotalCents: total, delivery: { deliveryMethod: "live-overnight", preferredDate: date, ageConfirmed: true, livePolicyAccepted: true } }), lines);
    expect(ok).toMatchObject({ ok: true });
    if (!ok.ok) return;
    const order = (await orders.getOrder(db.q, ok.orderId))!;
    expect(order).toMatchObject({ contains_live_animals: true, shipping_method: "live-overnight", preferred_delivery_date: date, total_cents: total });
    expect(order.live_animal_ack_at).not.toBeNull();
    expect(await stock("leopard-gecko")).toBe(before - 1);
  });

  it("rejects a tampered total and ignores prices sent from the browser", async () => {
    const lines = [await line("thermometer", 1)];
    const tampered = await place(input({ expectedTotalCents: 1 }), lines);
    expect(tampered).toMatchObject({ ok: false, step: "review" });

    // Extra fields such as a price are stripped by the schema; the order uses catalog prices.
    const sneaky = { ...input({ expectedTotalCents: 2499 }), unitPriceCents: 1, totalCents: 1 } as PlaceOrderInput;
    const r = await place(sneaky, lines);
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect((await orders.getOrder(db.q, r.orderId))!.total_cents).toBe(2499);
  });

  it("refuses to oversell when stock ran out after the cart was built", async () => {
    const lines = [await line("leopard-gecko", 1)];
    await pg.query("update products set stock_quantity = 0 where slug = 'leopard-gecko'");
    const r = await place(input({ expectedTotalCents: 7900, delivery: { deliveryMethod: "pickup", ageConfirmed: true, livePolicyAccepted: true } }), lines);
    expect(r).toMatchObject({ ok: false });
    expect(await stock("leopard-gecko")).toBe(0);
    await pg.query("update products set stock_quantity = 3 where slug = 'leopard-gecko'");
  });

  it("validation errors are reported per field", () => {
    const bad = input({ expectedTotalCents: 0, contact: { confirmEmail: "other@example.com", phone: "512555", postalCode: "ABC", region: "Texas" }, payment: "stripe" });
    bad.review.termsAccepted = false as true;
    const r = placeOrderSchema.safeParse(bad);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(errorMap(r.error)).toMatchObject({
        confirmEmail: expect.any(String),
        phone: expect.stringContaining("country code"),
        postalCode: expect.any(String),
        region: expect.any(String),
        paymentMethod: expect.any(String),
        termsAccepted: expect.any(String),
      });
    }
  });
});

describe("admin", () => {
  async function newOrder(qty = 1) {
    const r = await place(input({ expectedTotalCents: 1500 * qty + 999, payment: "bank-transfer" }), [await line("thermometer", qty)]);
    if (!r.ok) throw new Error(r.message);
    sent = [];
    return r.orderId;
  }

  it("sends payment details from the template, marks paid, adds tracking and logs history", async () => {
    const id = await newOrder();
    await orders.savePaymentTemplate(db.q, "bank-transfer", "Pay for {{order_number}}", "Hi {{customer_name}}, send {{amount}} to account 123 by {{due_date}}.");
    const order = (await orders.getOrder(db.q, id))!;
    const draft = await service.paymentEmailDraft(db.q, order, NOW);
    expect(draft.isDefault).toBe(false);
    expect(draft.subject).toBe(`Pay for ${order.order_number}`);
    expect(draft.body).toContain("Hi Jamie Rivera, send $24.99 to account 123");

    expect(await service.sendPaymentDetails(db.q, id, draft.subject, `${draft.body}\nEdited by admin`, NOW)).toMatchObject({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "jamie@example.com", subject: draft.subject });
    expect(sent[0].text).toContain("Edited by admin");
    let o = (await orders.getOrder(db.q, id))!;
    expect(o.status).toBe("payment_details_sent");
    expect(new Date(o.payment_due_at!).getTime()).toBe(NOW.getTime() + 3 * DAY);

    expect(await service.markOrderPaid(db.q, id, "BANK-REF-9")).toMatchObject({ ok: true });
    expect(await service.markOrderPaid(db.q, id, "again")).toMatchObject({ ok: false });
    expect(await service.addTracking(db.q, id, "UPS", "1Z999AA10123456784")).toMatchObject({ ok: true });
    expect(sent.map((e) => e.subject).join(" | ")).toMatch(/payment|paid/i);
    expect(sent.at(-1)!.html).toContain("1Z999AA10123456784");

    o = (await orders.getOrder(db.q, id))!;
    expect(o).toMatchObject({ status: "shipped", payment_reference: "BANK-REF-9", tracking_number: "1Z999AA10123456784", carrier: "UPS" });
    expect(o.order_events!.map((e) => e.status)).toEqual(["awaiting_payment_details", null, "payment_details_sent", "paid", "shipped"]);
    expect(await service.cancelOrderAndNotify(db.q, id, "Changed my mind")).toMatchObject({ ok: false });
  });

  it("tracking can't be added before payment", async () => {
    const id = await newOrder();
    expect(await service.addTracking(db.q, id, null, "TRACK123")).toMatchObject({ ok: false });
  });

  it("cancelling releases stock once and emails the customer", async () => {
    const before = await stock("thermometer");
    const id = await newOrder(3);
    expect(await stock("thermometer")).toBe(before - 3);
    expect(await service.cancelOrderAndNotify(db.q, id, "Out of stock at the supplier.")).toMatchObject({ ok: true });
    expect(await stock("thermometer")).toBe(before);
    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain("Out of stock at the supplier.");
    expect(await service.setManualStatus(db.q, id, "refunded")).toMatchObject({ ok: true });
    expect(await stock("thermometer")).toBe(before);
  });
});

describe("unpaid orders job", () => {
  it("reminds a day before the deadline, then cancels and releases stock", async () => {
    const before = await stock("thermometer");
    const r = await place(input({ expectedTotalCents: 3000 + 999 }), [await line("thermometer", 2)]);
    if (!r.ok) throw new Error(r.message);
    const untouched = await place(input({ expectedTotalCents: 1500 + 999 }), [await line("thermometer", 1)]); // details never sent
    if (!untouched.ok) throw new Error(untouched.message);
    await service.sendPaymentDetails(db.q, r.orderId, "Pay", "Please pay for your order soon, thank you.", NOW);
    sent = [];

    expect(await service.processUnpaidOrders(db.q, new Date(NOW.getTime() + 1 * DAY))).toEqual({ reminded: [], cancelled: [] });

    const day2 = await service.processUnpaidOrders(db.q, new Date(NOW.getTime() + 2.5 * DAY));
    expect(day2.reminded).toHaveLength(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("jamie@example.com");
    expect((await service.processUnpaidOrders(db.q, new Date(NOW.getTime() + 2.6 * DAY))).reminded).toHaveLength(0);

    sent = [];
    const day3 = await service.processUnpaidOrders(db.q, new Date(NOW.getTime() + 3 * DAY + 60_000));
    expect(day3.cancelled).toHaveLength(1);
    expect((await orders.getOrder(db.q, r.orderId))!.status).toBe("cancelled");
    expect(sent).toHaveLength(1);
    expect(await stock("thermometer")).toBe(before - 1); // only the untouched order still holds stock
    expect((await orders.getOrder(db.q, untouched.orderId))!.status).toBe("awaiting_payment_details");
  });
});
