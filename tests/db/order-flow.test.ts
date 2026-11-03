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

import type { CheckoutInput } from "@/lib/checkout-schema";
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

const form = (over: Partial<CheckoutInput> & { expectedTotalCents: number }): CheckoutInput => ({
  fullName: "Jamie Rivera",
  email: "jamie@example.com",
  phone: "+1 512 555 0134",
  company: "",
  country: "US",
  region: "TX",
  city: "Austin",
  address: "500 Congress Ave, Apt 4",
  postalCode: "78701",
  notes: "Leave at the front desk",
  paymentMethods: ["zelle"],
  ...over,
});

const LIVE_OK = () => ({ preferredDate: liveDeliveryDates(NOW)[0], ageConfirmed: true, livePolicyAccepted: true });

async function place(f: CheckoutInput, lines: PricedLine[], userId: string | null = null) {
  return service.placeOrderRequest(db, { form: f, lines, userId, cartId: null, now: NOW });
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
    ["leopard-gecko", "Leopard Gecko", "live-reptiles", 7900, 5, true],
  ] as const) {
    await pg.query(
      `insert into products (slug, name, category, short_description, long_description, price_cents, stock_quantity, sku, is_live_animal)
       values ($1, $2, $3, 'short', 'long', $4, $5, upper($1), $6)`,
      [slug, name, category, price, qty, live],
    );
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
    const before = await stock("thermometer");
    const r = await place(form({ expectedTotalCents: 3000, company: "Rivera Reptiles", paymentMethods: ["zelle", "paypal"] }), [await line("thermometer", 2)]);
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(r.orderNumber).toMatch(/^SH-\d{5,}$/);

    const order = (await orders.getOrder(db.q, r.orderId))!;
    expect(order).toMatchObject({
      status: "awaiting_confirmation",
      user_id: null,
      subtotal_cents: 3000,
      shipping_cents: 0,
      shipping_confirmed: false,
      total_cents: 3000,
      payment_methods: ["zelle", "paypal"],
      customer_name: "Jamie Rivera",
      company: "Rivera Reptiles",
      phone: "+1 512 555 0134",
      delivery_notes: "Leave at the front desk",
      stock_reserved: true,
    });
    expect(order.shipping_address).toMatchObject({ line1: "500 Congress Ave, Apt 4", state: "TX", postal_code: "78701", country: "US" });
    expect(await stock("thermometer")).toBe(before - 2);

    expect(sent.map((e) => e.to).sort()).toEqual(["jamie@example.com", OWNER].sort());
    const customer = sent.find((e) => e.to === "jamie@example.com")!;
    expect(customer.subject).toContain(r.orderNumber);
    expect(customer.replyTo).toBe("replies@example.com");
    expect(customer.text).toContain("Zelle, PayPal");
    expect(customer.text).toContain("Confirmed before you pay");
    const owner = sent.find((e) => e.to === OWNER)!;
    expect(owner.html).toContain(`/admin/orders/${r.orderId}`);
    expect(owner.text).toContain("+1 512 555 0134");
    expect(owner.replyTo).toBe("jamie@example.com");
  });

  it("ships supplies worldwide, with or without a region", async () => {
    const lines = [await line("thermometer", 1)];
    const de = await place(form({ expectedTotalCents: 1500, country: "DE", region: "", postalCode: "10115", city: "Berlin", paymentMethods: ["sepa"] }), lines);
    expect(de).toMatchObject({ ok: true });
    if (de.ok) expect((await orders.getOrder(db.q, de.orderId))!.shipping_address).toMatchObject({ country: "DE", state: null });
    expect(await place(form({ expectedTotalCents: 1500, country: "AE", region: "", postalCode: "", city: "Dubai", paymentMethods: ["paypal"] }), lines)).toMatchObject({ ok: true });
  });

  it("signed-in checkout links the order to the account and can save the address", async () => {
    const userId = "user_signed_in";
    const r = await place(form({ expectedTotalCents: 1500, saveAddress: true, country: "CA", region: "ON", postalCode: "M5V 2T6", city: "Toronto" }), [await line("thermometer", 1)], userId);
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(await orders.getOrderForUser(db.q, userId, r.orderId)).not.toBeNull();
    expect(await account.listAddresses(db.q, userId)).toMatchObject([{ line1: "500 Congress Ave, Apt 4", country: "CA", region: "ON", postal_code: "M5V 2T6" }]);
  });

  it("live animals need a weekday date and both confirmations", async () => {
    const lines = [await line("leopard-gecko", 1)];
    const missing = await place(form({ expectedTotalCents: 7900 }), lines);
    expect(missing).toMatchObject({ ok: false });
    if (!missing.ok) expect(Object.keys(missing.errors ?? {}).sort()).toEqual(["ageConfirmed", "livePolicyAccepted", "preferredDate"]);

    const saturday = await place(form({ expectedTotalCents: 7900, ...LIVE_OK(), preferredDate: "2026-11-07" }), lines);
    expect(saturday).toMatchObject({ ok: false, errors: { preferredDate: expect.any(String) } });

    const before = await stock("leopard-gecko");
    const ok = await place(form({ expectedTotalCents: 7900, ...LIVE_OK() }), lines);
    expect(ok).toMatchObject({ ok: true });
    if (!ok.ok) return;
    const order = (await orders.getOrder(db.q, ok.orderId))!;
    expect(order).toMatchObject({ contains_live_animals: true, shipping_method: "live-overnight", preferred_delivery_date: LIVE_OK().preferredDate });
    expect(order.live_animal_ack_at).not.toBeNull();
    expect(await stock("leopard-gecko")).toBe(before - 1);
  });

  it("blocks live animals to countries and US states outside the shipping list", async () => {
    const lines = [await line("leopard-gecko", 1)];
    const before = await stock("leopard-gecko");
    const hawaii = await place(form({ expectedTotalCents: 7900, ...LIVE_OK(), region: "HI", postalCode: "96813" }), lines);
    expect(hawaii).toMatchObject({ ok: false, errors: { region: expect.stringContaining("Hawaii") } });
    const germany = await place(form({ expectedTotalCents: 7900, ...LIVE_OK(), country: "DE", region: "", postalCode: "10115" }), lines);
    expect(germany).toMatchObject({ ok: false, errors: { country: expect.stringContaining("Germany") } });
    expect(await stock("leopard-gecko")).toBe(before);
  });

  it("requires a US state, a payment method, and text for Other", async () => {
    const lines = [await line("thermometer", 1)];
    expect(await place(form({ expectedTotalCents: 1500, region: "" }), lines)).toMatchObject({ ok: false, errors: { region: expect.any(String) } });
    expect(await place(form({ expectedTotalCents: 1500, paymentMethods: [] }), lines)).toMatchObject({ ok: false, errors: { paymentMethods: expect.any(String) } });
    expect(await place(form({ expectedTotalCents: 1500, paymentMethods: ["other"] }), lines)).toMatchObject({ ok: false, errors: { paymentOther: expect.any(String) } });
    const other = await place(form({ expectedTotalCents: 1500, paymentMethods: ["other"], paymentOther: "Western Union" }), lines);
    expect(other).toMatchObject({ ok: true });
    if (other.ok) expect((await orders.getOrder(db.q, other.orderId))!).toMatchObject({ payment_methods: ["other"], payment_other: "Western Union" });
  });

  it("rejects a tampered total and ignores prices sent from the browser", async () => {
    const lines = [await line("thermometer", 1)];
    expect(await place(form({ expectedTotalCents: 1 }), lines)).toMatchObject({ ok: false, message: expect.stringContaining("total changed") });

    // Extra fields such as a price are stripped by the schema; the order uses catalog prices.
    const sneaky = { ...form({ expectedTotalCents: 1500 }), unitPriceCents: 1, totalCents: 1, shippingCents: -500 } as CheckoutInput;
    const r = await place(sneaky, lines);
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect((await orders.getOrder(db.q, r.orderId))!).toMatchObject({ subtotal_cents: 1500, total_cents: 1500, shipping_cents: 0 });
  });

  it("refuses to oversell when stock ran out after the cart was built", async () => {
    const lines = [await line("leopard-gecko", 1)];
    const saved = await stock("leopard-gecko");
    await pg.query("update products set stock_quantity = 0 where slug = 'leopard-gecko'");
    const r = await place(form({ expectedTotalCents: 7900, ...LIVE_OK() }), lines);
    expect(r).toMatchObject({ ok: false });
    expect(await stock("leopard-gecko")).toBe(0);
    await pg.query("update products set stock_quantity = $1 where slug = 'leopard-gecko'", [saved]);
  });
});

describe("admin", () => {
  async function newOrder(qty = 1, methods = ["zelle", "sepa"]) {
    const r = await place(form({ expectedTotalCents: 1500 * qty, paymentMethods: methods }), [await line("thermometer", qty)]);
    if (!r.ok) throw new Error(r.message);
    sent = [];
    return r.orderId;
  }

  it("sends the confirmation with shipping cost and payment details, marks paid, adds tracking and logs history", async () => {
    const id = await newOrder(2);
    await orders.savePaymentTemplate(db.q, "zelle", {
      subject: "Order {{order_number}}: total {{total}}",
      body: "Hi {{customer_name}},\n\n{{items}}\n\n{{totals}}\n\nPay by {{payment_method}}:\n{{payment_details}}\n\nBy {{due_date}}.",
      details: { recipient: "pay@example.com", name: "ScaleHaven LLC" },
    });
    const order = (await orders.getOrder(db.q, id))!;
    const draft = await service.confirmationDraft(db.q, order, "zelle", 1495, NOW);
    expect(draft.detailsMissing).toBe(false);
    expect(draft.subject).toBe(`Order ${order.order_number}: total $44.95`);
    expect(draft.body).toContain("- Digital Thermometer × 2: $30.00");
    expect(draft.body).toContain("Shipping to United States: $14.95");
    expect(draft.body).toContain("Total to pay: $44.95");
    expect(draft.body).toContain("Zelle email or phone: pay@example.com\nName on the account: ScaleHaven LLC");

    // A method without saved details shows a placeholder for the admin to fill in
    expect((await service.confirmationDraft(db.q, order, "sepa", 1495, NOW)).detailsMissing).toBe(true);

    const r = await service.sendConfirmation(db.q, id, { methodId: "zelle", shippingCents: 1495, subject: draft.subject, body: `${draft.body}\nEdited by admin` }, NOW);
    expect(r).toMatchObject({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "jamie@example.com", subject: draft.subject });
    expect(sent[0].text).toContain("Edited by admin");
    expect(sent[0].text).toContain("pay@example.com");
    let o = (await orders.getOrder(db.q, id))!;
    expect(o).toMatchObject({ status: "confirmation_sent", shipping_cents: 1495, shipping_confirmed: true, total_cents: 4495, confirmed_payment_method: "zelle" });
    expect(new Date(o.payment_due_at!).getTime()).toBe(NOW.getTime() + 3 * DAY);

    expect(await service.markOrderPaid(db.q, id, "ZELLE-REF-9")).toMatchObject({ ok: true });
    expect(await service.markOrderPaid(db.q, id, "again")).toMatchObject({ ok: false });
    expect(await service.addTracking(db.q, id, "UPS", "1Z999AA10123456784")).toMatchObject({ ok: true });
    expect(sent.map((e) => e.subject)).toEqual([draft.subject, expect.stringContaining("Payment received"), expect.stringContaining("has shipped")]);
    expect(sent.at(-1)!.html).toContain("1Z999AA10123456784");

    o = (await orders.getOrder(db.q, id))!;
    expect(o).toMatchObject({ status: "shipped", payment_reference: "ZELLE-REF-9", tracking_number: "1Z999AA10123456784", carrier: "UPS" });
    expect(o.order_events!.map((e) => e.status)).toEqual(["awaiting_confirmation", null, "confirmation_sent", "paid", "shipped"]);
    expect(await service.cancelOrderAndNotify(db.q, id, "Changed my mind")).toMatchObject({ ok: false });
  });

  it("rejects an invalid shipping cost or method", async () => {
    const id = await newOrder();
    expect(await service.sendConfirmation(db.q, id, { methodId: "zelle", shippingCents: -1, subject: "s", body: "b" }, NOW)).toMatchObject({ ok: false });
    expect(await service.sendConfirmation(db.q, id, { methodId: "bitcoin", shippingCents: 100, subject: "s", body: "b" }, NOW)).toMatchObject({ ok: false });
    expect(sent).toHaveLength(0);
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

  it("lists orders by chosen payment method", async () => {
    await newOrder(1, ["revolut"]);
    const list = await orders.listOrders(db.q, { paymentMethod: "revolut" });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((o) => o.payment_methods.includes("revolut"))).toBe(true);
  });
});

describe("unpaid orders job", () => {
  it("reminds a day before the deadline, then cancels and releases stock", async () => {
    const before = await stock("thermometer");
    const r = await place(form({ expectedTotalCents: 3000 }), [await line("thermometer", 2)]);
    if (!r.ok) throw new Error(r.message);
    const untouched = await place(form({ expectedTotalCents: 1500 }), [await line("thermometer", 1)]); // never confirmed
    if (!untouched.ok) throw new Error(untouched.message);
    await service.sendConfirmation(db.q, r.orderId, { methodId: "zelle", shippingCents: 999, subject: "Confirmed", body: "Please pay for your order soon, thank you." }, NOW);
    sent = [];

    expect(await service.processUnpaidOrders(db.q, new Date(NOW.getTime() + 1 * DAY))).toEqual({ reminded: [], cancelled: [] });

    const day2 = await service.processUnpaidOrders(db.q, new Date(NOW.getTime() + 2.5 * DAY));
    expect(day2.reminded).toHaveLength(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("jamie@example.com");
    expect(sent[0].text).toContain("Zelle");
    expect((await service.processUnpaidOrders(db.q, new Date(NOW.getTime() + 2.6 * DAY))).reminded).toHaveLength(0);

    sent = [];
    const day3 = await service.processUnpaidOrders(db.q, new Date(NOW.getTime() + 3 * DAY + 60_000));
    expect(day3.cancelled).toHaveLength(1);
    expect((await orders.getOrder(db.q, r.orderId))!.status).toBe("cancelled");
    expect(sent).toHaveLength(1);
    expect(await stock("thermometer")).toBe(before - 1); // only the untouched order still holds stock
    expect((await orders.getOrder(db.q, untouched.orderId))!.status).toBe("awaiting_confirmation");
  });
});
