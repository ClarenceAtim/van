import "server-only";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth/server";
import { db } from "@/lib/db/pool";

/**
 * Server-side admin check for every admin page and action (middleware also checks).
 * Returns the database handle only after the role check passes.
 */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") notFound();
  return { profile, q: db() };
}

/** Environment problems shown on the admin dashboard. */
export function configWarnings() {
  const missing = (keys: string[]) => keys.filter((k) => !process.env[k]);
  const warnings: string[] = [];
  const neon = missing(["DATABASE_URL", "NEON_AUTH_BASE_URL", "NEON_AUTH_COOKIE_SECRET"]);
  if (neon.length) warnings.push(`Neon not fully configured: set ${neon.join(", ")}`);
  if (!process.env.AWS_ENDPOINT_URL_S3) warnings.push("Image uploads disabled: Neon Object Storage env vars are missing");
  const orderEmail = missing(["ORDER_FROM_EMAIL", "ORDER_REPLY_TO_EMAIL", "ORDER_NOTIFICATION_EMAIL"]);
  if (orderEmail.length) warnings.push(`Order emails use fallback addresses: set ${orderEmail.join(", ")} (see docs/ORDERS-AND-PAYMENTS.md)`);
  if (!process.env.CRON_SECRET) warnings.push("Set CRON_SECRET so unpaid orders get reminders and are released automatically");
  const turnstile = missing(["TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"]);
  if (turnstile.length) warnings.push(`Bot protection disabled: set ${turnstile.join(", ")}`);
  if (!process.env.RESEND_API_KEY) warnings.push("Emails are not being sent: set RESEND_API_KEY and EMAIL_FROM");
  if (!process.env.CART_COOKIE_SECRET) warnings.push("Set CART_COOKIE_SECRET — the cart is disabled in production without it");
  if (!process.env.UPSTASH_REDIS_REST_URL) warnings.push("Rate limiting uses the Postgres limiter (fine). Add Upstash Redis for higher traffic.");
  return warnings;
}
