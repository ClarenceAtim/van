"use server";

import { redirect } from "next/navigation";
import { mergeGuestCart } from "@/lib/cart";
import { isSupabaseConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { fieldErrors, loginSchema, magicLinkSchema, safeRedirect, signupSchema, type FormState } from "@/lib/validation";

const NOT_CONFIGURED: FormState = { ok: false, message: "Accounts aren't available yet. Please check back soon." };
const RATE_LIMITED: FormState = { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
const BOT: FormState = { ok: false, message: "Please complete the security check and try again." };

/**
 * When CAPTCHA is enabled in Supabase Auth, Supabase verifies the Turnstile token itself
 * (tokens are single-use, so we must not verify it twice). Otherwise we verify it here.
 */
const supabaseVerifiesCaptcha = process.env.SUPABASE_AUTH_CAPTCHA === "true";

async function botCheck(token: string | null | undefined) {
  return supabaseVerifiesCaptcha ? true : verifyTurnstile(token);
}
const captcha = (token: string | null | undefined) => (supabaseVerifiesCaptcha && token ? { captchaToken: token } : {});

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, password, turnstileToken, next } = parsed.data;
  if (!(await rateLimit("auth", email))) return RATE_LIMITED;
  if (!(await botCheck(turnstileToken))) return BOT;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password, options: captcha(turnstileToken) });
  // Same message for unknown email and wrong password (no account enumeration).
  if (error || !data.user) return { ok: false, message: error?.message.includes("Email not confirmed") ? "Please confirm your email first — check your inbox." : "Incorrect email or password." };
  await mergeGuestCart(data.user.id);
  redirect(safeRedirect(next));
}

export async function sendMagicLink(_prev: FormState, form: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = magicLinkSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, turnstileToken, next } = parsed.data;
  if (!(await rateLimit("auth", email))) return RATE_LIMITED;
  if (!(await botCheck(turnstileToken))) return BOT;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: absoluteUrl(`/auth/callback?next=${encodeURIComponent(safeRedirect(next))}`), shouldCreateUser: true, ...captcha(turnstileToken) },
  });
  if (error) console.error("magic link:", error.message);
  return { ok: true, message: `If ${email} can sign in, a link is on its way. It expires in 1 hour.` };
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, password, fullName, turnstileToken } = parsed.data;
  if (!(await rateLimit("auth", email))) return RATE_LIMITED;
  if (!(await botCheck(turnstileToken))) return BOT;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: absoluteUrl("/auth/callback?next=/account"), ...captcha(turnstileToken) },
  });
  if (error) {
    if (/password/i.test(error.message)) return { ok: false, errors: { password: [error.message] } };
    console.error("signup:", error.message);
    return { ok: false, message: "We couldn't create your account. Please try again." };
  }
  if (data.session && data.user) {
    await mergeGuestCart(data.user.id);
    redirect("/account");
  }
  return { ok: true, message: `Almost done! We've sent a confirmation link to ${email}.` };
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
