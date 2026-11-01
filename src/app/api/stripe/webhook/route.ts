import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { clearCartById } from "@/lib/cart";
import { CATALOG_TAG } from "@/lib/catalog";
import { sendOrderConfirmation } from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. The signature is verified against STRIPE_WEBHOOK_SECRET, and this
 * is the only place an order can become "paid".
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (e) {
    console.warn("stripe webhook: bad signature", (e as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.payment_status === "paid") await fulfill(session);
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const orderId = event.data.object.metadata?.order_id;
        if (orderId) await createAdminClient().from("orders").update({ status: "cancelled" }).eq("id", orderId).eq("status", "pending");
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (pi && charge.refunded) await createAdminClient().from("orders").update({ status: "refunded" }).eq("stripe_payment_intent_id", pi);
        break;
      }
    }
  } catch (e) {
    console.error(`stripe webhook ${event.type} failed:`, e);
    // 500 makes Stripe retry later; fulfill_order is idempotent so retries are safe.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function fulfill(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id;
  if (!orderId) throw new Error(`session ${session.id} has no order_id`);
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("*, order_items(*)").eq("id", orderId).single();
  if (!order) throw new Error(`order ${orderId} not found`);
  if (order.stripe_session_id && order.stripe_session_id !== session.id) throw new Error(`session mismatch for order ${orderId}`);

  // The amount Stripe charged must cover what we priced on the server.
  const charged = session.amount_total ?? 0;
  if (charged < order.total_cents) throw new Error(`amount mismatch for ${order.order_number}: charged ${charged}, expected ${order.total_cents}`);

  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  await db
    .from("orders")
    .update({
      email: session.customer_details?.email ?? order.email,
      tax_cents: session.total_details?.amount_tax ?? 0,
      total_cents: charged,
      shipping_address: {
        ...(order.shipping_address ?? {}),
        name: shipping?.name ?? session.customer_details?.name,
        line1: address?.line1,
        line2: address?.line2,
        city: address?.city,
        state: address?.state,
        postal_code: address?.postal_code,
        country: address?.country,
        phone: session.customer_details?.phone ?? null,
      },
    })
    .eq("id", orderId);

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? "");
  const { data: firstTime, error } = await db.rpc("fulfill_order", { p_order_id: orderId, p_payment_intent: paymentIntent });
  if (error) throw new Error(`fulfill_order: ${error.message}`);
  if (!firstTime) return; // already processed (Stripe retry)

  if (session.metadata?.cart_id) await clearCartById(session.metadata.cart_id);
  revalidateTag(CATALOG_TAG); // stock changed
  await sendOrderConfirmation({ ...order, email: session.customer_details?.email ?? order.email, total_cents: charged, tax_cents: session.total_details?.amount_tax ?? 0, items: order.order_items });
}
