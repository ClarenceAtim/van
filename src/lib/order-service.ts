import "server-only";
import { countryName } from "@/config/countries";
import { paymentMethodName, paymentMethods, paymentMethodsLabel, paymentSettings } from "@/config/payments";
import { siteConfig } from "@/config/site";
import { checkoutSchema, errorMap, type CheckoutInput } from "@/lib/checkout-schema";
import { saveAddress } from "@/lib/db/account";
import * as orders from "@/lib/db/orders";
import type { Queryable } from "@/lib/db/types";
import * as email from "@/lib/email";
import { formatDate, formatMoney } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/orders";
import { computeTotals, liveDeliveryDates, validateLines, type PricedLine } from "@/lib/pricing";

/**
 * Order rules, independent of HTTP: the checkout server action and /admin call these, and tests
 * call them directly against an in-memory database.
 */
export type Db = { q: Queryable; transaction: <T>(fn: (q: Queryable) => Promise<T>) => Promise<T> };

const DAY = 86_400_000;

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; message: string; errors?: Record<string, string> };

/**
 * Creates an order request from the server-side cart. Everything is validated again here, and
 * prices and totals are recalculated from the catalog: nothing price-related comes from the browser.
 */
export async function placeOrderRequest(
  db: Db,
  input: { form: CheckoutInput; lines: PricedLine[]; userId: string | null; cartId: string | null; now?: Date },
): Promise<PlaceOrderResult> {
  const { lines, userId, cartId } = input;
  const now = input.now ?? new Date();
  if (!lines.length) return { ok: false, message: "Your cart is empty." };
  const problems = validateLines(lines);
  if (problems.length) return { ok: false, message: problems.map((p) => p.message).join(" ") };

  const totals = computeTotals(lines);
  const parsed = checkoutSchema({ containsLiveAnimals: totals.containsLiveAnimals, deliveryDates: liveDeliveryDates(now) }).safeParse(input.form);
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: errorMap(parsed.error) };
  const f = parsed.data;

  if (f.expectedTotalCents !== totals.totalCents) {
    return { ok: false, message: `Your order total changed to ${formatMoney(totals.totalCents)} (a price or stock change). Please check your order and place it again.` };
  }

  const placedAt = now.toISOString();
  let created: { id: string; order_number: string };
  try {
    created = await db.transaction((q) =>
      orders.createOrder(
        q,
        {
          user_id: userId,
          email: f.email,
          customer_name: f.fullName,
          phone: f.phone,
          company: f.company || null,
          subtotal_cents: totals.subtotalCents,
          tax_cents: totals.taxCents,
          total_cents: totals.totalCents,
          currency: siteConfig.currency,
          shipping_method: totals.containsLiveAnimals ? "live-overnight" : "standard",
          shipping_address: {
            name: f.fullName,
            company: f.company || null,
            line1: f.address,
            city: f.city,
            state: f.region || null,
            postal_code: f.postalCode || null,
            country: f.country,
          },
          delivery_notes: f.notes || null,
          preferred_delivery_date: totals.containsLiveAnimals ? f.preferredDate : null,
          contains_live_animals: totals.containsLiveAnimals,
          live_animal_ack_at: totals.containsLiveAnimals ? placedAt : null,
          payment_methods: f.paymentMethods,
          payment_other: f.paymentMethods.includes("other") ? f.paymentOther : null,
          cart_id: cartId,
        },
        lines.map((l) => ({
          product_id: l.productId,
          product_slug: l.slug,
          product_name: l.name,
          sku: l.sku,
          unit_price_cents: l.unitPriceCents,
          quantity: l.quantity,
          is_live_animal: l.isLiveAnimal,
        })),
      ),
    );
  } catch (e) {
    if (e instanceof orders.OutOfStockError) return { ok: false, message: e.message };
    throw e;
  }

  if (userId && f.saveAddress && !f.savedAddressId) {
    await saveAddress(db.q, userId, {
      full_name: f.fullName,
      company: f.company || null,
      line1: f.address,
      city: f.city,
      region: f.region || null,
      postal_code: f.postalCode || null,
      country: f.country,
      phone: f.phone,
      is_default: false,
    });
  }

  const order = (await orders.getOrder(db.q, created.id))!;
  const [toCustomer, toOwner] = await Promise.all([email.sendOrderReceived(order), email.sendNewOrderNotification(order)]);
  await orders.addOrderEvent(
    db.q,
    order.id,
    null,
    `Customer chose: ${paymentMethodsLabel(order.payment_methods, order.payment_other)}. "Order received" email ${toCustomer ? "sent" : "not sent (email isn't set up)"}; owner notification ${toOwner ? "sent" : "not sent"}.`,
  );
  return { ok: true, orderId: order.id, orderNumber: order.order_number };
}

// ───────────── Order confirmation (admin) ─────────────

export type AdminResult = { ok: boolean; message: string };

/** Placeholders available in confirmation templates. */
export const TEMPLATE_VARIABLES = [
  "customer_name", "order_number", "items", "subtotal", "tax", "shipping_cost", "total", "totals",
  "payment_method", "payment_details", "due_date", "store_name",
] as const;

/** Default confirmation email for a method, used until you save your own in /admin. */
export function defaultTemplate(methodId: string) {
  return {
    subject: "Order {{order_number}} confirmed: shipping and payment details",
    body: `Hi {{customer_name}},

Thank you for your order {{order_number}}. Here it is with the shipping cost:

{{items}}

{{totals}}

How to pay by {{payment_method}}:
{{payment_details}}

Please use {{order_number}} as the payment reference and pay by {{due_date}}. Your items are reserved until then.

Reply to this email once you've paid, or if you have any questions.

Thank you,
{{store_name}}`,
    details: {} as Record<string, string>,
    isDefault: true,
    methodId,
  };
}

/** "Label: value" lines from the details saved for a method. */
export function paymentDetailsText(methodId: string, details: Record<string, string>) {
  const method = paymentMethods.find((m) => m.id === methodId);
  const lines = (method?.fields ?? []).filter((f) => details[f.key]?.trim()).map((f) => `${f.label.replace(" (optional)", "")}: ${details[f.key].trim()}`);
  return lines.length ? lines.join("\n") : `[Add your ${paymentMethodName(methodId)} details in /admin → Settings → Payment templates, or type them here.]`;
}

/** Fills a template for an order, a shipping cost and the method to send details for. */
export function confirmationVariables(order: Order, methodId: string, shippingCents: number, details: Record<string, string>, dueAt: Date) {
  const money = (c: number) => formatMoney(c, order.currency);
  const total = order.subtotal_cents + order.tax_cents + shippingCents;
  const methodName = methodId === "other" && order.payment_other ? order.payment_other : paymentMethodName(methodId);
  const totals = [
    `Subtotal: ${money(order.subtotal_cents)}`,
    ...(order.tax_cents ? [`${siteConfig.tax.label}: ${money(order.tax_cents)}`] : []),
    `Shipping to ${countryName(order.shipping_address?.country)}: ${shippingCents ? money(shippingCents) : "Free"}`,
    `Total to pay: ${money(total)}`,
  ].join("\n");
  return {
    customer_name: order.customer_name ?? "there",
    order_number: order.order_number,
    items: (order.order_items ?? []).map((i) => `- ${i.product_name} × ${i.quantity}: ${money(i.line_total_cents)}`).join("\n"),
    subtotal: money(order.subtotal_cents),
    tax: money(order.tax_cents),
    shipping_cost: shippingCents ? money(shippingCents) : "Free",
    total: money(total),
    totals,
    payment_method: methodName,
    payment_details: paymentDetailsText(methodId, details),
    due_date: formatDate(dueAt.toISOString()),
    store_name: siteConfig.name,
  };
}

export async function confirmationDraft(q: Queryable, order: Order, methodId: string, shippingCents: number, now = new Date()) {
  const saved = await orders.getPaymentTemplate(q, methodId);
  const t = saved ?? defaultTemplate(methodId);
  const vars = confirmationVariables(order, methodId, shippingCents, t.details, new Date(now.getTime() + paymentSettings.payWithinDays * DAY));
  return { subject: email.fillTemplate(t.subject, vars), body: email.fillTemplate(t.body, vars), detailsMissing: !Object.values(t.details).some((v) => v?.trim()) };
}

/** Sends the order confirmation (shipping cost + payment details) and starts the payment deadline. */
export async function sendConfirmation(
  q: Queryable,
  orderId: string,
  c: { methodId: string; shippingCents: number; subject: string; body: string },
  now = new Date(),
): Promise<AdminResult> {
  if (!paymentMethods.some((m) => m.id === c.methodId)) return { ok: false, message: "Choose a payment method." };
  if (!Number.isInteger(c.shippingCents) || c.shippingCents < 0) return { ok: false, message: "Enter the shipping cost." };
  const dueAt = new Date(now.getTime() + paymentSettings.payWithinDays * DAY);
  if (!(await orders.markConfirmationSent(q, orderId, { shippingCents: c.shippingCents, paymentMethod: c.methodId, dueAt }))) {
    return { ok: false, message: "Confirmations can only be sent for unpaid orders." };
  }
  const order = (await orders.getOrder(q, orderId))!;
  const sent = await email.sendOrderConfirmation(order, c.subject, c.body);
  await orders.addOrderEvent(
    q,
    orderId,
    "confirmation_sent",
    `Confirmation ${sent ? "emailed" : "recorded (email not sent — check email settings)"}: shipping ${formatMoney(c.shippingCents, order.currency)}, total ${formatMoney(order.total_cents, order.currency)}, payment details for ${paymentMethodName(c.methodId)}. Pay within ${paymentSettings.payWithinDays} days.`,
  );
  return { ok: true, message: sent ? "Order confirmation sent." : "Status updated, but the email wasn't sent (check RESEND_API_KEY)." };
}

export async function markOrderPaid(q: Queryable, orderId: string, reference: string | null): Promise<AdminResult> {
  if (!(await orders.markPaid(q, orderId, reference))) return { ok: false, message: "Only unpaid orders can be marked as paid." };
  const order = (await orders.getOrder(q, orderId))!;
  const sent = await email.sendPaymentConfirmed(order);
  await orders.addOrderEvent(q, orderId, "paid", `Marked as paid${reference ? ` (reference: ${reference})` : ""}. Confirmation email ${sent ? "sent" : "not sent"}.`);
  return { ok: true, message: "Order marked as paid." };
}

export async function addTracking(q: Queryable, orderId: string, carrier: string | null, tracking: string): Promise<AdminResult> {
  if (!(await orders.markShipped(q, orderId, carrier, tracking))) return { ok: false, message: "Tracking can be added once the order is paid." };
  const order = (await orders.getOrder(q, orderId))!;
  const sent = await email.sendShippingUpdate(order);
  await orders.addOrderEvent(q, orderId, "shipped", `Shipped${carrier ? ` with ${carrier}` : ""}, tracking ${tracking}. Email ${sent ? "sent" : "not sent"}.`);
  return { ok: true, message: sent ? "Tracking saved and emailed to the customer." : "Tracking saved (email not sent)." };
}

export async function cancelOrderAndNotify(q: Queryable, orderId: string, reason: string): Promise<AdminResult> {
  if (!(await orders.cancelOrder(q, orderId))) return { ok: false, message: "Shipped, delivered or already cancelled orders can't be cancelled." };
  const order = (await orders.getOrder(q, orderId))!;
  const sent = await email.sendOrderCancelled(order, reason);
  await orders.addOrderEvent(q, orderId, "cancelled", `Cancelled: ${reason} Stock released. Email ${sent ? "sent" : "not sent"}.`);
  return { ok: true, message: "Order cancelled and stock released." };
}

/** Manual status moves that don't send email (processing, delivered, refunded). */
const MANUAL: Record<string, { from: OrderStatus[]; label: string }> = {
  processing: { from: ["paid"], label: "Marked as processing (packing)." },
  delivered: { from: ["shipped"], label: "Marked as delivered." },
  refunded: { from: ["paid", "processing", "shipped", "delivered", "cancelled"], label: "Marked as refunded." },
};

export async function setManualStatus(q: Queryable, orderId: string, to: "processing" | "delivered" | "refunded"): Promise<AdminResult> {
  const rule = MANUAL[to];
  const before = await orders.getOrder(q, orderId);
  if (!before || !(await orders.setStatus(q, orderId, rule.from, to))) return { ok: false, message: `Can't change this order to "${to}" from its current status.` };
  // Refunded before shipping: the items are still here, so they go back on sale.
  if (to === "refunded" && (before.status === "paid" || before.status === "processing")) await orders.releaseStock(q, orderId);
  await orders.addOrderEvent(q, orderId, to, rule.label);
  return { ok: true, message: rule.label };
}

/**
 * Daily job: reminds customers a day before their payment deadline, then cancels unpaid orders
 * after it and releases their stock.
 */
export async function processUnpaidOrders(q: Queryable, now = new Date()) {
  const reminded: string[] = [];
  for (const id of await orders.ordersNeedingReminder(q, now, paymentSettings.reminderDaysBefore * DAY)) {
    const order = (await orders.getOrder(q, id))!;
    const sent = await email.sendPaymentReminder(order);
    await orders.markReminderSent(q, id);
    await orders.addOrderEvent(q, id, null, `Payment reminder ${sent ? "emailed" : "due (email not sent)"}.`);
    reminded.push(order.order_number);
  }
  const cancelled: string[] = [];
  for (const id of await orders.expiredUnpaidOrders(q, now)) {
    if (!(await orders.cancelOrder(q, id))) continue;
    const order = (await orders.getOrder(q, id))!;
    const sent = await email.sendOrderCancelled(order, `We didn't receive payment within ${paymentSettings.payWithinDays} days, so the reserved items have been released.`);
    await orders.addOrderEvent(q, id, "cancelled", `Cancelled automatically: not paid within ${paymentSettings.payWithinDays} days. Stock released. Email ${sent ? "sent" : "not sent"}.`);
    cancelled.push(order.order_number);
  }
  return { reminded, cancelled };
}

export const knownPaymentMethodIds = () => paymentMethods.map((m) => m.id);
