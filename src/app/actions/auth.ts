"use server";

import { redirect } from "next/navigation";
import { auth, isAuthConfigured } from "@/lib/auth/server";
import { mergeGuestCart } from "@/lib/cart";
import { ensureProfile } from "@/lib/db/account";
import { db, isDatabaseConfigured } from "@/lib/db/pool";
import { rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/seo";
import { verifyTurnstile } from "@/lib/turnstile";
import { fieldErrors, loginSchema, magicLinkSchema, safeRedirect, signupSchema, type FormState } from "@/lib/validation";

type MagicLinkApi = { magicLink: (body: { email: string; callbackURL: string }) => Promise<{ error: { message?: string } | null }> };

const NOT_CONFIGURED: FormState = { ok: false, message: "Accounts aren't available yet. Please check back soon." };
const RATE_LIMITED: FormState = { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
const BOT: FormState = { ok: false, message: "Please complete the security check and try again." };

/** Runs after Neon Auth has created a session: profile row + guest cart merge. */
async function afterSignIn(user: { id: string; email: string; name?: string | null }) {
  if (!isDatabaseConfigured()) return;
  await ensureProfile(db(), user);
  await mergeGuestCart(user.id);
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  if (!isAuthConfigured()) return NOT_CONFIGURED;
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, password, turnstileToken, next } = parsed.data;
  if (!(await rateLimit("auth", email))) return RATE_LIMITED;
  if (!(await verifyTurnstile(turnstileToken))) return BOT;

  const { data, error } = await auth().signIn.email({ email, password });
  if (error || !data?.user) {
    // Same message for unknown email and wrong password (no account enumeration).
    return { ok: false, message: /verif/i.test(error?.message ?? "") ? "Please verify your email first — check your inbox." : "Incorrect email or password." };
  }
  await afterSignIn(data.user);
  redirect(safeRedirect(next));
}

export async function sendMagicLink(_prev: FormState, form: FormData): Promise<FormState> {
  if (!isAuthConfigured()) return NOT_CONFIGURED;
  const parsed = magicLinkSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, turnstileToken, next } = parsed.data;
  if (!(await rateLimit("auth", email))) return RATE_LIMITED;
  if (!(await verifyTurnstile(turnstileToken))) return BOT;

  // Magic links must be enabled for the branch in Neon (Auth → Plugins). The endpoint
  // (`sign-in/magic-link`) is part of Neon's server API, but its TypeScript types omit it.
  const signInApi = auth().signIn as unknown as MagicLinkApi;
  const { error } = await signInApi.magicLink({ email, callbackURL: absoluteUrl(safeRedirect(next)) });
  if (error) console.error("magic link:", error.message);
  return { ok: true, message: `If ${email} can sign in, a link is on its way.` };
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  if (!isAuthConfigured()) return NOT_CONFIGURED;
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, password, fullName, turnstileToken } = parsed.data;
  if (!(await rateLimit("auth", email))) return RATE_LIMITED;
  if (!(await verifyTurnstile(turnstileToken))) return BOT;

  const { data, error } = await auth().signUp.email({ email, password, name: fullName });
  if (error || !data?.user) {
    if (/password/i.test(error?.message ?? "")) return { ok: false, errors: { password: [error!.message!] } };
    if (/exist/i.test(error?.message ?? "")) return { ok: false, message: "An account with that email already exists. Try signing in." };
    console.error("signup:", error?.message);
    return { ok: false, message: "We couldn't create your account. Please try again." };
  }
  await afterSignIn(data.user);
  redirect("/account");
}

export async function signOut() {
  if (isAuthConfigured()) await auth().signOut();
  redirect("/");
}
