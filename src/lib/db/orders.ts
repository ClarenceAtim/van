import type { Order, OrderStatus, ShippingAddress } from "@/lib/orders";
import { one, type Queryable } from "./types";

export type NewOrder = {
  user_id: string | null;
  email: string;
  customer_name: string;
  phone: string;
  whatsapp: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  shipping_method: string;
  shipping_address: ShippingAddress;
  delivery_notes: string | null;
  preferred_delivery_date: string | null;
  contains_live_animals: boolean;
  live_animal_ack_at: string | null;
  payment_method: string;
  terms_accepted_at: string;
  cart_id: string | null;
};

export type NewOrderItem = {
  product_id: string;
  product_slug: string;
  product_name: string;
  sku: string;
  unit_price_cents: number;
  quantity: number;
  is_live_animal: boolean;
};

/** Thrown when there isn't enough stock left to reserve an item. */
export class OutOfStockError extends Error {
  constructor(public productName: string) {
    super(`Sorry, ${productName} just sold out or there isn't enough left. Please update your cart.`);
  }
}

/**
 * Creates an order awaiting payment details, with a price snapshot of every line, and reserves
 * the stock. Call inside a transaction: if any item can't be reserved, the whole order rolls back.
 */
export async function createOrder(q: Queryable, o: NewOrder, items: NewOrderItem[]) {
  const order = (await one<{ id: string; order_number: string }>(
    q,
    `insert into orders (user_id, email, customer_name, phone, whatsapp, status, subtotal_cents, shipping_cents, tax_cents, total_cents, currency,
                         shipping_method, shipping_address, delivery_notes, preferred_delivery_date, contains_live_animals, live_animal_ack_at,
                         payment_method, terms_accepted_at, cart_id, stock_reserved)
     values ($1, $2, $3, $4, $5, 'awaiting_payment_details', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, true)
     returning id, order_number`,
    [
      o.user_id, o.email, o.customer_name, o.phone, o.whatsapp, o.subtotal_cents, o.shipping_cents, o.tax_cents, o.total_cents, o.currency,
      o.shipping_method, JSON.stringify(o.shipping_address), o.delivery_notes, o.preferred_delivery_date, o.contains_live_animals, o.live_animal_ack_at,
      o.payment_method, o.terms_accepted_at, o.cart_id,
    ],
  ))!;
  for (const i of items) {
    const reserved = await one<{ id: string }>(
      q,
      "update products set stock_quantity = stock_quantity - $2 where id = $1 and active and stock_quantity >= $2 returning id",
      [i.product_id, i.quantity],
    );
    if (!reserved) throw new OutOfStockError(i.product_name);
    await q.query(
      `insert into order_items (order_id, product_id, product_slug, product_name, sku, unit_price_cents, quantity, line_total_cents, is_live_animal)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [order.id, i.product_id, i.product_slug, i.product_name, i.sku, i.unit_price_cents, i.quantity, i.unit_price_cents * i.quantity, i.is_live_animal],
    );
  }
  await addOrderEvent(q, order.id, "awaiting_payment_details", "Order placed. Stock reserved.");
  return order;
}

export async function addOrderEvent(q: Queryable, orderId: string, status: OrderStatus | null, message: string) {
  await q.query("insert into order_events (order_id, status, message) values ($1, $2, $3)", [orderId, status, message]);
}

const ORDER_JSON = `to_jsonb(o) || jsonb_build_object(
  'order_items', coalesce((select jsonb_agg(to_jsonb(oi) order by oi.product_name) from order_items oi where oi.order_id = o.id), '[]'::jsonb),
  'order_events', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'status', e.status, 'message', e.message, 'created_at', e.created_at) order by e.created_at)
                            from order_events e where e.order_id = o.id), '[]'::jsonb)) as order`;

/** A customer's orders (newest first). */
export async function listOrdersForUser(q: Queryable, userId: string, limit = 100): Promise<Order[]> {
  const { rows } = await q.query<{ order: Order }>(`select ${ORDER_JSON} from orders o where o.user_id = $1 order by o.created_at desc limit $2`, [userId, limit]);
  return rows.map((r) => r.order);
}

/** Returns the order only if it belongs to this user. */
export async function getOrderForUser(q: Queryable, userId: string, orderId: string): Promise<Order | null> {
  return (await one<{ order: Order }>(q, `select ${ORDER_JSON} from orders o where o.id = $1 and o.user_id = $2`, [orderId, userId]))?.order ?? null;
}

export async function getOrder(q: Queryable, orderId: string): Promise<Order | null> {
  return (await one<{ order: Order }>(q, `select ${ORDER_JSON} from orders o where o.id = $1`, [orderId]))?.order ?? null;
}

export async function getOrderByNumber(q: Queryable, orderNumber: string): Promise<Order | null> {
  return (await one<{ order: Order }>(q, `select ${ORDER_JSON} from orders o where o.order_number = $1`, [orderNumber]))?.order ?? null;
}

/** Admin list, optionally filtered by status and payment method. Each filter adds its own placeholder. */
export async function listOrders(q: Queryable, filters: { status?: OrderStatus | null; paymentMethod?: string | null } = {}, limit = 200): Promise<Order[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.status) where.push(`o.status = $${params.push(filters.status)}`);
  if (filters.paymentMethod) where.push(`o.payment_method = $${params.push(filters.paymentMethod)}`);
  const sql = `select ${ORDER_JSON} from orders o ${where.length ? `where ${where.join(" and ")}` : ""} order by o.created_at desc limit $${params.push(limit)}`;
  const { rows } = await q.query<{ order: Order }>(sql, params);
  return rows.map((r) => r.order);
}

/** Changes status only if the order is currently in one of `from`. Returns false if it wasn't. */
async function transition(q: Queryable, id: string, from: readonly OrderStatus[], to: OrderStatus, set = "", params: unknown[] = []) {
  const r = await one<{ id: string }>(
    q,
    `update orders set status = $2${set ? `, ${set}` : ""} where id = $1 and status = any($3::text[]) returning id`,
    [id, to, from, ...params],
  );
  return !!r;
}

export async function markPaymentDetailsSent(q: Queryable, id: string, dueAt: Date) {
  return transition(q, id, ["awaiting_payment_details", "payment_details_sent"], "payment_details_sent", "payment_details_sent_at = now(), payment_due_at = $4, reminder_sent_at = null", [dueAt.toISOString()]);
}

/** Marks paid and counts the sale. Stock was already reserved when the order was placed. */
export async function markPaid(q: Queryable, id: string, reference: string | null) {
  const ok = await transition(q, id, ["awaiting_payment_details", "payment_details_sent"], "paid", "paid_at = now(), payment_reference = $4", [reference]);
  if (ok) {
    await q.query(
      `update products p set sales_count = p.sales_count + oi.quantity from order_items oi where oi.order_id = $1 and oi.product_id = p.id`,
      [id],
    );
  }
  return ok;
}

export async function markShipped(q: Queryable, id: string, carrier: string | null, tracking: string) {
  return transition(q, id, ["paid", "processing", "shipped"], "shipped", "carrier = $4, tracking_number = $5", [carrier, tracking]);
}

export async function setStatus(q: Queryable, id: string, from: readonly OrderStatus[], to: OrderStatus) {
  return transition(q, id, from, to);
}

/** Puts reserved stock back. Safe to call twice: only the first call releases anything. */
export async function releaseStock(q: Queryable, id: string) {
  const r = await one<{ id: string }>(q, "update orders set stock_reserved = false where id = $1 and stock_reserved returning id", [id]);
  if (!r) return false;
  await q.query(
    "update products p set stock_quantity = p.stock_quantity + oi.quantity from order_items oi where oi.order_id = $1 and oi.product_id = p.id",
    [id],
  );
  return true;
}

/** Cancels an order that hasn't shipped and releases its stock. */
export async function cancelOrder(q: Queryable, id: string) {
  const ok = await transition(q, id, ["awaiting_payment_details", "payment_details_sent", "paid", "processing"], "cancelled", "cancelled_at = now()");
  if (ok) await releaseStock(q, id);
  return ok;
}

/** Unpaid orders whose reminder is due (not yet reminded, due date within `beforeMs`). */
export async function ordersNeedingReminder(q: Queryable, now: Date, beforeMs: number) {
  const { rows } = await q.query<{ id: string }>(
    `select id from orders where status = 'payment_details_sent' and reminder_sent_at is null
        and payment_due_at > $1 and payment_due_at <= $2`,
    [now.toISOString(), new Date(now.getTime() + beforeMs).toISOString()],
  );
  return rows.map((r) => r.id);
}

export async function markReminderSent(q: Queryable, id: string) {
  await q.query("update orders set reminder_sent_at = now() where id = $1", [id]);
}

/** Unpaid orders past their payment deadline. */
export async function expiredUnpaidOrders(q: Queryable, now: Date) {
  const { rows } = await q.query<{ id: string }>("select id from orders where status = 'payment_details_sent' and payment_due_at <= $1", [now.toISOString()]);
  return rows.map((r) => r.id);
}

// ───────────── Payment templates (admin only) ─────────────

export type PaymentTemplate = { method_id: string; subject: string; body: string; updated_at: string | null };

export async function listPaymentTemplates(q: Queryable): Promise<PaymentTemplate[]> {
  const { rows } = await q.query<PaymentTemplate>("select method_id, subject, body, updated_at::text from payment_templates");
  return rows;
}

export async function getPaymentTemplate(q: Queryable, methodId: string): Promise<PaymentTemplate | null> {
  return one<PaymentTemplate>(q, "select method_id, subject, body, updated_at::text from payment_templates where method_id = $1", [methodId]);
}

export async function savePaymentTemplate(q: Queryable, methodId: string, subject: string, body: string) {
  await q.query(
    `insert into payment_templates (method_id, subject, body) values ($1, $2, $3)
     on conflict (method_id) do update set subject = excluded.subject, body = excluded.body`,
    [methodId, subject, body],
  );
}
