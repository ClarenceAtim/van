"use server";

import { siteConfig } from "@/config/site";
import { getUser } from "@/lib/auth/server";
import { clearCartById, clearCookieCart, currentCartId, getCart } from "@/lib/cart";
import type { CheckoutInput } from "@/lib/checkout-schema";
import { db, isDatabaseConfigured, transaction } from "@/lib/db/pool";
import { orderToken } from "@/lib/order-token";
import { prepareEmailOrderRequest, placeOrderRequest, type EmailOrderPrepared, type PlaceOrderResult } from "@/lib/order-service";
import type { PricedLine } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

/**
 * Checkout = an order request. No payment is taken here: the customer ticks how they'd like to pay,
 * the order is created with stock reserved, and the store emails the shipping cost and payment
 * details from /admin. When the database is unavailable (quota, outage) the order is emailed to
 * the store inbox instead (same validation, stock not reserved), and the customer still gets a
 * confirmation page. The email itself is posted from the customer's browser: FormSubmit refuses
 * the same post from this server (HTTP 403), but accepts it from a real browser. (To add an
 * online payment provider later, check the chosen method's `kind` after the order is created
 * and redirect to the provider from here.)
 */

export type PlaceOrderResponse =
  | ((PlaceOrderResult | EmailOrderPrepared) & { confirmationUrl?: string })
  | { ok: false; message: string; errors?: Record<string, string> };

export async function placeOrder(form: CheckoutInput): Promise<PlaceOrderResponse> {
  if (!(await rateLimit("checkout"))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  if (!(await verifyTurnstile(typeof form?.turnstileToken === "string" ? form.turnstileToken : null))) {
    return { ok: false, message: "Please complete the security check and try again." };
  }

  // The cart is fetched before the database attempt so the email fallback still has the lines.
  let lines: PricedLine[] = [];
  let cartId: string | null = null;
  try {
    const [user, cart, id] = await Promise.all([getUser(), getCart(), currentCartId()]);
    lines = cart.lines;
    cartId = id;
    if (!lines.length) return { ok: false, message: "Your cart is empty." };
    if (!isDatabaseConfigured()) return emailOrder(form, lines);

    const result = await placeOrderRequest({ q: db(), transaction }, { form, lines, userId: user?.id ?? null, cartId });
    if (!result.ok) return result;

    await clearCarts(cartId);
    return { ...result, confirmationUrl: `/checkout/confirmation/${result.orderNumber}?t=${orderToken(result.orderNumber)}` };
  } catch (error) {
    if (!lines.length) {
      // The cart itself couldn't be read; there's nothing to email.
      console.error("Order placement failed (cart unavailable):", error);
      return { ok: false, message: `Ordering isn't available right now. Please email ${siteConfig.contact.email}.` };
    }
    // Database unavailable (quota exceeded, outage) → email the order to the
    // store inbox instead of turning the customer away.
    console.error("Order placement failed (database unavailable), preparing email order instead:", error);
    return emailOrder(form, lines);
  }
}

async function clearCarts(cartId: string | null) {
  if (cartId) {
    try {
      await clearCartById(cartId);
    } catch (error) {
      // Order is placed; a stale cart is harmless.
      console.error("Failed to clear cart after order:", error);
    }
  }
  try {
    await clearCookieCart();
  } catch (error) {
    console.error("Failed to clear cookie cart after order:", error);
  }
}

// The cart is cleared by clearCartAfterEmailOrder, once the browser confirms the email was sent.
async function emailOrder(form: CheckoutInput, lines: PricedLine[]): Promise<PlaceOrderResponse> {
  const result = await prepareEmailOrderRequest({ form, lines });
  if (!result.ok) return result;
  return { ...result, confirmationUrl: `/checkout/confirmation/${result.orderNumber}?t=${orderToken(result.orderNumber)}&emailed=1` };
}

/** Clears the cart after the browser has emailed the order (see the checkout form). */
export async function clearCartAfterEmailOrder(): Promise<void> {
  await clearCarts(await currentCartId().catch(() => null));
}
