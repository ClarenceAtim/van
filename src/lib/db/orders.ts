import type { Order, OrderStatus } from "@/lib/orders";
import { one, type Queryable } from "./types";

export type NewOrder = {
  user_id: string | null;
  email: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  shipping_method: string;
  shipping_address: Record<string, unknown>;
  contains_live_animals: boolean;
  live_animal_ack_at: string | null;
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

/** Creates a pending order with a price snapshot of every line. Call inside a transaction. */
export async function createPendingOrder(q: Queryable, o: NewOrder, items: NewOrderItem[]) {
  const order = (await one<{ id: string; order_number: string }>(
    q,
    `insert into orders (user_id, email, status, subtotal_cents, shipping_cents, tax_cents, total_cents, currency,
                         shipping_method, shipping_address, contains_live_animals, live_animal_ack_at)
     values ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id, order_number`,
    [o.user_id, o.email, o.subtotal_cents, o.shipping_cents, o.tax_cents, o.total_cents, o.currency, o.shipping_method, JSON.stringify(o.shipping_address), o.contains_live_animals, o.live_animal_ack_at],
  ))!;
  for (const i of items) {
    await q.query(
      `insert into order_items (order_id, product_id, product_slug, product_name, sku, unit_price_cents, quantity, line_total_cents, is_live_animal)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [order.id, i.product_id, i.product_slug, i.product_name, i.sku, i.unit_price_cents, i.quantity, i.unit_price_cents * i.quantity, i.is_live_animal],
    );
  }
  return order;
}

export async function setStripeSession(q: Queryable, orderId: string, sessionId: string) {
  await q.query("update orders set stripe_session_id = $2 where id = $1", [orderId, sessionId]);
}

const ORDER_JSON = `to_jsonb(o) || jsonb_build_object('order_items', coalesce(
  (select jsonb_agg(to_jsonb(oi) order by oi.product_name) from order_items oi where oi.order_id = o.id), '[]'::jsonb)) as order`;

/** A customer's paid orders (newest first). Pending checkouts are hidden. */
export async function listOrdersForUser(q: Queryable, userId: string, limit = 100): Promise<Order[]> {
  const { rows } = await q.query<{ order: Order }>(
    `select ${ORDER_JSON} from orders o where o.user_id = $1 and o.status <> 'pending' order by o.created_at desc limit $2`,
    [userId, limit],
  );
  return rows.map((r) => r.order);
}

/** Returns the order only if it belongs to this user. */
export async function getOrderForUser(q: Queryable, userId: string, orderId: string): Promise<Order | null> {
  return (await one<{ order: Order }>(q, `select ${ORDER_JSON} from orders o where o.id = $1 and o.user_id = $2`, [orderId, userId]))?.order ?? null;
}

export async function getOrder(q: Queryable, orderId: string): Promise<Order | null> {
  return (await one<{ order: Order }>(q, `select ${ORDER_JSON} from orders o where o.id = $1`, [orderId]))?.order ?? null;
}

export async function getOrderSummaryBySession(q: Queryable, sessionId: string) {
  return one<{ order_number: string; status: OrderStatus; total_cents: number; currency: string; email: string; contains_live_animals: boolean }>(
    q,
    "select order_number, status, total_cents, currency, email, contains_live_animals from orders where stripe_session_id = $1",
    [sessionId],
  );
}

export async function listOrders(q: Queryable, status: OrderStatus | null, limit = 200): Promise<Order[]> {
  // Each branch passes exactly the parameters its SQL uses: Postgres rejects unused $n placeholders
  // ("could not determine data type of parameter").
  const { rows } = status
    ? await q.query<{ order: Order }>(`select ${ORDER_JSON} from orders o where o.status = $1 order by o.created_at desc limit $2`, [status, limit])
    : await q.query<{ order: Order }>(`select ${ORDER_JSON} from orders o where o.status <> 'pending' order by o.created_at desc limit $1`, [limit]);
  return rows.map((r) => r.order);
}

/** Records Stripe's shipping/email details, then marks paid + decrements stock exactly once. */
export async function fulfillOrder(
  q: Queryable,
  orderId: string,
  details: { email: string; tax_cents: number; total_cents: number; shipping_address: Record<string, unknown>; payment_intent: string },
): Promise<boolean> {
  await q.query(
    `update orders set email = $2, tax_cents = $3, total_cents = $4, shipping_address = coalesce(shipping_address, '{}'::jsonb) || $5::jsonb
      where id = $1 and status = 'pending'`,
    [orderId, details.email, details.tax_cents, details.total_cents, JSON.stringify(details.shipping_address)],
  );
  const r = await one<{ fulfilled: boolean }>(q, "select fulfill_order($1, $2) as fulfilled", [orderId, details.payment_intent]);
  return r?.fulfilled === true;
}

export async function cancelPendingOrder(q: Queryable, orderId: string) {
  await q.query("update orders set status = 'cancelled' where id = $1 and status = 'pending'", [orderId]);
}

export async function markRefunded(q: Queryable, paymentIntent: string) {
  await q.query("update orders set status = 'refunded' where stripe_payment_intent_id = $1", [paymentIntent]);
}

export async function updateOrderStatus(q: Queryable, id: string, status: OrderStatus, carrier: string | null, tracking: string | null) {
  await q.query("update orders set status = $2, carrier = $3, tracking_number = $4 where id = $1", [id, status, carrier, tracking]);
}
