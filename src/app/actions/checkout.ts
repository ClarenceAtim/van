"use server";

import { siteConfig } from "@/config/site";
import { getUser } from "@/lib/auth/server";
import { clearCartById, currentCartId, getCart } from "@/lib/cart";
import { errorMap, placeOrderSchema, type PlaceOrderInput } from "@/lib/checkout-schema";
import { regionAllowed } from "@/lib/db/catalog";
import { db, isDatabaseConfigured, transaction } from "@/lib/db/pool";
import { orderToken } from "@/lib/order-token";
import { placeOrderRequest, type PlaceOrderResult } from "@/lib/order-service";
import { deliveryOptions, liveDeliveryDates, type DeliveryOption } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

/**
 * Checkout = an order request. No payment is taken here: the customer chooses a payment method,
 * the order is created with stock reserved, and the store emails payment details from /admin.
 * (To add an online payment provider later, branch on the payment method's `kind` after the
 * order is created and redirect to the provider.)
 */

export type DeliveryStep = {
  options: DeliveryOption[];
  dates: string[];
  containsLiveAnimals: boolean;
  /** Set when live animals can't ship to the chosen address. */
  liveAnimalProblem: string | null;
  subtotalCents: number;
};

/** Step 2: delivery methods and prices for the current cart and address, calculated on the server. */
export async function getDeliveryStep(country: string, region: string): Promise<DeliveryStep> {
  const cart = await getCart();
  const { subtotalCents, containsLiveAnimals } = cart.totals;
  let liveAnimalProblem: string | null = null;
  if (containsLiveAnimals) {
    if (country !== "US") liveAnimalProblem = "Live animals can only ship within the United States.";
    else if (isDatabaseConfigured()) {
      const r = await regionAllowed(db(), `US-${region}`);
      if (!r?.allowed) liveAnimalProblem = `Sorry, we can't ship live animals to ${r?.name ?? region}. Choose local pickup or remove the animals from your cart.`;
    }
  }
  return { options: deliveryOptions(subtotalCents, containsLiveAnimals), dates: containsLiveAnimals ? liveDeliveryDates() : [], containsLiveAnimals, liveAnimalProblem, subtotalCents };
}

export type PlaceOrderResponse = (PlaceOrderResult & { confirmationUrl?: string }) | { ok: false; message: string; step?: "contact" | "delivery" | "payment" | "review"; errors?: Record<string, string> };

const STEP_OF: Record<string, "contact" | "delivery" | "payment" | "review"> = { contact: "contact", delivery: "delivery", payment: "payment", review: "review" };

/** Step 4: validate everything again, recalculate on the server, reserve stock and create the order. */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResponse> {
  if (!(await rateLimit("checkout"))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: "Please fix the highlighted fields.", step: STEP_OF[String(first.path[0])], errors: errorMap(parsed.error) };
  }
  if (!(await verifyTurnstile(parsed.data.review.turnstileToken))) return { ok: false, step: "review", message: "Please complete the security check and try again." };
  if (!isDatabaseConfigured()) return { ok: false, message: `Ordering isn't available right now. Please email ${siteConfig.contact.email}.` };

  const user = await getUser();
  const cart = await getCart();
  const cartId = await currentCartId();
  const result = await placeOrderRequest({ q: db(), transaction }, { data: parsed.data, lines: cart.lines, userId: user?.id ?? null, cartId });
  if (!result.ok) return result;

  if (cartId) await clearCartById(cartId);
  return { ...result, confirmationUrl: `/checkout/confirmation/${result.orderNumber}?t=${orderToken(result.orderNumber)}` };
}
