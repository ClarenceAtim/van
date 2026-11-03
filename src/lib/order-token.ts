import "server-only";
import crypto from "node:crypto";

/**
 * Signed token for the order confirmation link, so guests can see their own confirmation page
 * without an account, and nobody can browse other orders by guessing order numbers.
 */
function secret() {
  const s = process.env.CART_COOKIE_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("CART_COOKIE_SECRET is not set");
  return s || "development-only-cart-secret";
}

export const orderToken = (orderNumber: string) => crypto.createHmac("sha256", secret()).update(`order:${orderNumber}`).digest("base64url").slice(0, 32);

export function verifyOrderToken(orderNumber: string, token: string | undefined) {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(orderToken(orderNumber));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
