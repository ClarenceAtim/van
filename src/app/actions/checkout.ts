"use server";

import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { currentCartId, getCart } from "@/lib/cart";
import { rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/seo";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { checkoutSchema, fieldErrors, type FormState } from "@/lib/validation";

/**
 * Creates a pending order from the server-side cart (prices come from the
 * catalog, never the browser) and redirects to Stripe Checkout. The order is
 * only marked paid by the Stripe webhook.
 */
export async function startCheckout(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("checkout"))) return { ok: false, message: "Too many checkout attempts. Please wait a few minutes." };
  const parsed = checkoutSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await verifyTurnstile(parsed.data.turnstileToken))) return { ok: false, message: "Please complete the security check and try again." };
  if (!isStripeConfigured() || !isServiceRoleConfigured()) return { ok: false, message: "Checkout isn't available yet. Please contact us to order." };

  const user = await getUser();
  const email = user?.email ?? parsed.data.email;
  if (!email) return { ok: false, errors: { email: ["Enter your email for the order confirmation"] } };

  const cart = await getCart();
  if (!cart.lines.length) return { ok: false, message: "Your cart is empty." };
  if (cart.problems.length) return { ok: false, message: cart.problems.map((p) => p.message).join(" ") };

  const db = createAdminClient();
  const { totals } = cart;
  const region = parsed.data.shippingRegion;

  if (totals.containsLiveAnimals) {
    if (!parsed.data.liveAnimalAck) {
      return { ok: false, errors: { liveAnimalAck: [`You must be ${siteConfig.liveAnimals.minimumAge}+ and agree to the Live Animal Policy`] } };
    }
    const { data: allowed } = await db.from("live_animal_regions").select("allowed, name").eq("code", `US-${region}`).maybeSingle();
    if (!allowed?.allowed) {
      return { ok: false, errors: { shippingRegion: [`Sorry, we can't ship live animals to ${allowed?.name ?? region}. Remove the animals to order supplies.`] } };
    }
  }

  const { data: order, error } = await db
    .from("orders")
    .insert({
      user_id: user?.id ?? null,
      email,
      status: "pending",
      subtotal_cents: totals.subtotalCents,
      shipping_cents: totals.shippingCents,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
      currency: siteConfig.currency,
      shipping_method: totals.shippingMethod,
      shipping_address: { declared_region: region },
      contains_live_animals: totals.containsLiveAnimals,
      live_animal_ack_at: totals.containsLiveAnimals ? new Date().toISOString() : null,
    })
    .select("id, order_number")
    .single();
  if (error || !order) {
    console.error("create order:", error?.message);
    return { ok: false, message: "We couldn't start checkout. Please try again." };
  }

  const { error: itemsError } = await db.from("order_items").insert(
    cart.lines.map((l) => ({
      order_id: order.id,
      product_id: l.productId,
      product_slug: l.slug,
      product_name: l.name,
      sku: l.sku,
      unit_price_cents: l.unitPriceCents,
      quantity: l.quantity,
      line_total_cents: l.unitPriceCents * l.quantity,
      is_live_animal: l.isLiveAnimal,
    })),
  );
  if (itemsError) {
    await db.from("orders").delete().eq("id", order.id);
    return { ok: false, message: "We couldn't start checkout. Please try again." };
  }

  const cartId = await currentCartId();
  const currency = siteConfig.currency.toLowerCase();
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: email,
      client_reference_id: order.id,
      metadata: { order_id: order.id, order_number: order.order_number, cart_id: cartId ?? "" },
      payment_intent_data: { metadata: { order_id: order.id, order_number: order.order_number } },
      line_items: cart.lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency,
          unit_amount: l.unitPriceCents,
          product_data: {
            name: l.name,
            metadata: { sku: l.sku, slug: l.slug },
            ...(l.product.image && !l.product.image.url.startsWith("/") ? { images: [l.product.image.url] } : {}),
          },
        },
      })),
      shipping_address_collection: { allowed_countries: [...siteConfig.shippingCountries] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: totals.shippingLabel,
            fixed_amount: { amount: totals.shippingCents, currency },
            delivery_estimate: totals.containsLiveAnimals
              ? { minimum: { unit: "business_day", value: 1 }, maximum: { unit: "business_day", value: 3 } }
              : { minimum: { unit: "business_day", value: 3 }, maximum: { unit: "business_day", value: 7 } },
          },
        },
      ],
      phone_number_collection: { enabled: totals.containsLiveAnimals },
      custom_text: totals.containsLiveAnimals
        ? { shipping_address: { message: `Live animals can only ship to the state you selected (${region}). An adult must be available to receive the package.` } }
        : undefined,
      success_url: absoluteUrl("/checkout/success?session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: absoluteUrl("/checkout/cancelled"),
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    { idempotencyKey: `checkout-${order.id}` },
  );

  await db.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
  redirect(session.url!);
}
