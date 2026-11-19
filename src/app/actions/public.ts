"use server";

import { contactEmailFields, newsletterEmailFields, sendContactNotification } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { addContactMessage, subscribe } from "@/lib/db/inbox";
import { db, isDatabaseConfigured } from "@/lib/db/pool";
import { verifyTurnstile } from "@/lib/turnstile";
import { contactSchema, fieldErrors, newsletterSchema, type FormState } from "@/lib/validation";

const BOT_MESSAGE = "Please complete the security check and try again.";
const RATE_MESSAGE = "Too many attempts. Please try again later.";
const CONTACT_THANKS = "Thanks — we'll reply within one business day.";
const NEWSLETTER_THANKS = "Thanks! You're on the list.";

/**
 * What a public form action returns. When the database couldn't take the submission, the
 * action hands the email to the browser instead (emailEndpoint + emailFields): FormSubmit
 * refuses server-side posts from our hosting provider (HTTP 403) but accepts the same post
 * from a real browser — the same fallback the checkout uses for orders.
 */
export type PublicFormResult = Exclude<FormState, null> & { emailEndpoint?: string; emailFields?: Record<string, string> };

/** fieldErrors() is typed nullable but never returns null; keep the failure shape explicit. */
function invalid(error: Parameters<typeof fieldErrors>[0]): PublicFormResult {
  return fieldErrors(error) ?? { ok: false, message: "Please fix the highlighted fields." };
}

export async function subscribeNewsletter(form: FormData): Promise<PublicFormResult> {
  const parsed = newsletterSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit("newsletter"))) return { ok: false, message: RATE_MESSAGE };
  if (!(await verifyTurnstile(parsed.data.turnstileToken))) return { ok: false, message: BOT_MESSAGE };

  // Same response whether or not the address was already subscribed (no email enumeration).
  if (isDatabaseConfigured()) {
    try {
      await subscribe(db(), parsed.data.email);
      return { ok: true, message: NEWSLETTER_THANKS };
    } catch (e) {
      console.error("newsletter:", (e as Error).message);
    }
  }
  // Database unavailable — the signup goes to the store inbox from the browser instead.
  return { ok: true, message: NEWSLETTER_THANKS, ...newsletterEmailFields(parsed.data.email) };
}

export async function prepareContactMessage(form: FormData): Promise<PublicFormResult> {
  // Honeypot: real users never see or fill this field.
  if (form.get("website")) return { ok: true, message: CONTACT_THANKS };
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit("contact", parsed.data.email))) return { ok: false, message: RATE_MESSAGE };
  if (!(await verifyTurnstile(parsed.data.turnstileToken))) return { ok: false, message: BOT_MESSAGE };

  const { turnstileToken: _t, ...message } = parsed.data;
  if (isDatabaseConfigured()) {
    try {
      await addContactMessage(db(), message);
      // Stored: the owner reads it in /admin. Still try the server notification (Resend
      // when a key is set); its FormSubmit fallback fails from this server, harmlessly.
      await sendContactNotification(message);
      return { ok: true, message: CONTACT_THANKS };
    } catch (e) {
      console.error("contact:", (e as Error).message);
    }
  }
  // Database unavailable (or not configured) — the message goes to the store inbox from
  // the browser instead. This also fixes a silent-loss bug: the old code treated a missing
  // database as "saved" and reported success while the message went nowhere.
  return { ok: true, message: CONTACT_THANKS, ...contactEmailFields(message) };
}
