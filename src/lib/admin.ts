import "server-only";
import { notFound } from "next/navigation";
import { createClient, getProfile } from "@/lib/supabase/server";

/**
 * Server-side admin check for every admin page and action (middleware also checks).
 * Returns a Supabase client acting as the admin, so RLS enforces the role a second time.
 */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") notFound();
  return { profile, supabase: await createClient() };
}

/** Environment problems shown on the admin dashboard. */
export function configWarnings() {
  const missing = (keys: string[]) => keys.filter((k) => !process.env[k]);
  const warnings: string[] = [];
  const stripe = missing(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]);
  if (stripe.length) warnings.push(`Checkout disabled: set ${stripe.join(", ")}`);
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) warnings.push("Stripe is in TEST mode — switch to live keys before launch.");
  const turnstile = missing(["TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"]);
  if (turnstile.length) warnings.push(`Bot protection disabled: set ${turnstile.join(", ")}`);
  if (!process.env.RESEND_API_KEY) warnings.push("Emails are not being sent: set RESEND_API_KEY and EMAIL_FROM");
  if (!process.env.CART_COOKIE_SECRET) warnings.push("Set CART_COOKIE_SECRET (cart cookies are currently signed with the service role key)");
  if (!process.env.UPSTASH_REDIS_REST_URL) warnings.push("Rate limiting uses the Supabase limiter (fine). Add Upstash Redis for higher traffic.");
  return warnings;
}
