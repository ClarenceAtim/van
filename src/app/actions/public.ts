"use server";

import { sendContactNotification } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { addContactMessage, subscribe } from "@/lib/db/inbox";
import { db, isDatabaseConfigured } from "@/lib/db/pool";
import { verifyTurnstile } from "@/lib/turnstile";
import { contactSchema, fieldErrors, newsletterSchema, type FormState } from "@/lib/validation";

const BOT_MESSAGE = "Please complete the security check and try again.";
const RATE_MESSAGE = "Too many attempts. Please try again later.";

export async function subscribeNewsletter(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = newsletterSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await rateLimit("newsletter"))) return { ok: false, message: RATE_MESSAGE };
  if (!(await verifyTurnstile(parsed.data.turnstileToken))) return { ok: false, message: BOT_MESSAGE };

  if (isDatabaseConfigured()) {
    try {
      await subscribe(db(), parsed.data.email);
    } catch (e) {
      console.error("newsletter:", (e as Error).message);
      return { ok: false, message: "Something went wrong. Please try again." };
    }
  }
  // Same response whether or not the address was already subscribed (no email enumeration).
  return { ok: true, message: "Thanks! You're on the list." };
}

export async function sendContactMessage(_prev: FormState, form: FormData): Promise<FormState> {
  // Honeypot: real users never see or fill this field.
  if (form.get("website")) return { ok: true, message: "Thanks — we'll reply within one business day." };
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await rateLimit("contact", parsed.data.email))) return { ok: false, message: RATE_MESSAGE };
  if (!(await verifyTurnstile(parsed.data.turnstileToken))) return { ok: false, message: BOT_MESSAGE };

  const { turnstileToken: _t, ...message } = parsed.data;
  if (isDatabaseConfigured()) {
    try {
      await addContactMessage(db(), message);
    } catch (e) {
      console.error("contact:", (e as Error).message);
      return { ok: false, message: "We couldn't send your message. Please email us instead." };
    }
  }
  await sendContactNotification(message);
  return { ok: true, message: "Thanks — we'll reply within one business day." };
}
