"use server";

import { siteConfig } from "@/config/site";
import { getUser } from "@/lib/auth/server";
import { clearCartById, currentCartId, getCart } from "@/lib/cart";
import type { CheckoutInput } from "@/lib/checkout-schema";
import { db, isDatabaseConfigured, transaction } from "@/lib/db/pool";
import { orderToken } from "@/lib/order-token";
import { placeOrderRequest, type PlaceOrderResult } from "@/lib/order-service";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

/**
 * Checkout = an order request. No payment is taken here: the customer ticks how they'd like to pay,
 * the order is created with stock reserved, and the store emails the shipping cost and payment
 * details from /admin. (To add an online payment provider later, check the chosen method's `kind`
 * after the order is created and redirect to the provider from here.)
 */

export type PlaceOrderResponse = (PlaceOrderResult & { confirmationUrl?: string }) | { ok: false; message: string; errors?: Record<string, string> };

export async function placeOrder(form: CheckoutInput): Promise<PlaceOrderResponse> {
  if (!(await rateLimit("checkout"))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  if (!(await verifyTurnstile(typeof form?.turnstileToken === "string" ? form.turnstileToken : null))) {
    return { ok: false, message: "Please complete the security check and try again." };
  }
  if (!isDatabaseConfigured()) return { ok: false, message: `Ordering isn't available right now. Please email ${siteConfig.contact.email}.` };

  const [user, cart, cartId] = await Promise.all([getUser(), getCart(), currentCartId()]);
  const result = await placeOrderRequest({ q: db(), transaction }, { form, lines: cart.lines, userId: user?.id ?? null, cartId });
  if (!result.ok) return result;

  if (cartId) await clearCartById(cartId);
  return { ...result, confirmationUrl: `/checkout/confirmation/${result.orderNumber}?t=${orderToken(result.orderNumber)}` };
}
