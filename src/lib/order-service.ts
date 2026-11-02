import "server-only";
import { paymentMethodName, paymentMethods, paymentSettings } from "@/config/payments";
import { siteConfig } from "@/config/site";
import type { PlaceOrderData } from "@/lib/checkout-schema";
import { saveAddress } from "@/lib/db/account";
import { regionAllowed } from "@/lib/db/catalog";
import * as orders from "@/lib/db/orders";
import type { Queryable } from "@/lib/db/types";
import * as email from "@/lib/email";
import { formatMoney } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/orders";
import { liveDeliveryDates, totalsWithDelivery, validateLines, type PricedLine } from "@/lib/pricing";

/**
 * Order rules, independent of HTTP: the checkout server action and /admin call these, and tests
 * call them directly against an in-memory database.
 */
export type Db = { q: Queryable; transaction: <T>(fn: (q: Queryable) => Promise<T>) => Promise<T> };

const DAY = 86_400_000;

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; message: string; step?: "contact" | "delivery" | "payment" | "review"; errors?: Record<string, string> };

/**
 * Creates an order request from the server-side cart. Prices, delivery cost and totals are
 * recalculated here; nothing price-related is taken from the browser.
 */
export async function placeOrderRequest(
  db: Db,
  input: { data: PlaceOrderData; lines: PricedLine[]; userId: string | null; cartId: string | null; now?: Date },
): Promise<PlaceOrderResult> {
  const { data, lines, userId, cartId } = input;
  const now = input.now ?? new Date();
  if (!lines.length) return { ok: false, message: "Your cart is empty." };
  const problems = validateLines(lines);
  if (problems.length) return { ok: false, message: problems.map((p) => p.message).join(" ") };

  const { contact, delivery, payment, review } = data;
  const totals = totalsWithDelivery(lines, delivery.deliveryMethod);
  if (!totals) return { ok: false, step: "delivery", message: "Please choose an available delivery method.", errors: { deliveryMethod: "Choose an available delivery method" } };

  let preferredDate: string | null = null;
  if (totals.containsLiveAnimals) {
    const errors: Record<string, string> = {};
    if (!delivery.ageConfirmed) errors.ageConfirmed = `You must be ${siteConfig.liveAnimals.minimumAge} or older to buy live animals`;
    if (!delivery.livePolicyAccepted) errors.livePolicyAccepted = "Please agree to the Live Animal Policy";
    if (totals.shippingMethod === "live-overnight") {
      if (!liveDeliveryDates(now).includes(delivery.preferredDate)) errors.preferredDate = "Choose one of the available delivery dates";
      else preferredDate = delivery.preferredDate;
      if (contact.country !== "US") errors.deliveryMethod = "Live animals can only ship within the United States";
      else {
        const region = await regionAllowed(db.q, `US-${contact.region}`);
        if (!region?.allowed) errors.deliveryMethod = `Sorry, we can't ship live animals to ${region?.name ?? contact.region}. Remove the animals to order supplies.`;
      }
    }
    if (Object.keys(errors).length) return { ok: false, step: "delivery", message: "Please check the delivery details.", errors };
  }

  if (review.expectedTotalCents !== totals.totalCents) {
    return { ok: false, step: "review", message: `Your order total changed to ${formatMoney(totals.totalCents)} (a price or stock change). Please review your order and place it again.` };
  }

  const placedAt = now.toISOString();
  let created: { id: string; order_number: string };
  try {
    created = await db.transaction((q) =>
      orders.createOrder(
        q,
        {
          user_id: userId,
          email: contact.email,
          customer_name: contact.fullName,
          phone: contact.phone,
          whatsapp: contact.whatsapp || null,
          subtotal_cents: totals.subtotalCents,
          shipping_cents: totals.shippingCents,
          tax_cents: totals.taxCents,
          total_cents: totals.totalCents,
          currency: siteConfig.currency,
          shipping_method: totals.shippingMethod,
          shipping_address: {
            name: contact.fullName,
            line1: contact.line1,
            line2: contact.line2 || null,
            city: contact.city,
            state: contact.region,
            postal_code: contact.postalCode,
            country: contact.country,
          },
          delivery_notes: contact.deliveryNotes || null,
          preferred_delivery_date: preferredDate,
          contains_live_animals: totals.containsLiveAnimals,
          live_animal_ack_at: totals.containsLiveAnimals ? placedAt : null,
          payment_method: payment.paymentMethod,
          terms_accepted_at: placedAt,
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

  if (userId && contact.saveAddress && contact.country === "US" && !contact.savedAddressId) {
    await saveAddress(db.q, userId, {
      full_name: contact.fullName,
      line1: contact.line1,
      line2: contact.line2 || null,
      city: contact.city,
      region: contact.region,
      postal_code: contact.postalCode,
      phone: contact.phone,
      is_default: false,
    });
  }

  const order = (await orders.getOrder(db.q, created.id))!;
  const [toCustomer, toOwner] = await Promise.all([email.sendOrderReceived(order), email.sendNewOrderNotification(order)]);
  await orders.addOrderEvent(
    db.q,
    order.id,
    null,
    `"Order received" email ${toCustomer ? "sent to the customer" : "not sent (email isn't set up)"}; owner notification ${toOwner ? "sent" : "not sent"}.`,
  );
  return { ok: true, orderId: order.id, orderNumber: order.order_number };
}

// ───────────── Admin ─────────────

export type AdminResult = { ok: boolean; message: string };

/** Default payment email for a method, used until the template is saved in /admin. */
export function defaultTemplate(methodId: string) {
  const name = paymentMethodName(methodId);
  return {
    subject: `Payment details for order {{order_number}}`,
    body: `Hi {{customer_name}},

Thank you for your order {{order_number}}. Here is how to pay {{amount}} by ${name}:

[Add your ${name} details here in /admin → Settings → Payment templates.]

Please include your order number {{order_number}} as the payment reference, and pay by {{due_date}}. Your items are reserved until then.

Reply to this email once you've paid, or if you have any questions.

Thank you,
{{store_name}}`,
  };
}

export async function paymentEmailDraft(q: Queryable, order: Order, now = new Date()) {
  const saved = order.payment_method ? await orders.getPaymentTemplate(q, order.payment_method) : null;
  const t = saved ?? defaultTemplate(order.payment_method ?? "");
  const due = new Date(now.getTime() + paymentSettings.payWithinDays * DAY);
  return { subject: email.fillTemplate(t.subject, order, due), body: email.fillTemplate(t.body, order, due), isDefault: !saved };
}

export async function sendPaymentDetails(q: Queryable, orderId: string, subject: string, body: string, now = new Date()): Promise<AdminResult> {
  const order = await orders.getOrder(q, orderId);
  if (!order) return { ok: false, message: "Order not found." };
  if (!(await orders.markPaymentDetailsSent(q, orderId, new Date(now.getTime() + paymentSettings.payWithinDays * DAY)))) {
    return { ok: false, message: "Payment details can only be sent for unpaid orders." };
  }
  const sent = await email.sendPaymentDetails(order, subject, body);
  await orders.addOrderEvent(q, orderId, "payment_details_sent", `${paymentMethodName(order.payment_method)} payment details ${sent ? "emailed" : "recorded (email not sent — check email settings)"}: "${subject}". Pay within ${paymentSettings.payWithinDays} days.`);
  return { ok: true, message: sent ? "Payment details sent." : "Status updated, but the email wasn't sent (check RESEND_API_KEY)." };
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
