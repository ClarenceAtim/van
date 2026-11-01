import { z } from "zod";
import { MAX_QUANTITY_PER_LINE } from "@/lib/pricing";

/** Trims, strips control characters and collapses whitespace. Output is still rendered as text, never HTML. */
const clean = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(max));

const multiline = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(max));

export const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(254));
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
const turnstileToken = z.string().max(4096).optional().nullable();

export const cartMutationSchema = z.object({
  slug,
  quantity: z.coerce.number().int().min(0).max(MAX_QUANTITY_PER_LINE),
});

export const searchQuerySchema = z.object({ q: clean(100).pipe(z.string().min(2)) });

export const contactSchema = z.object({
  name: clean(100).pipe(z.string().min(2, "Please enter your name")),
  email,
  subject: clean(150).pipe(z.string().min(3, "Please add a subject")),
  message: multiline(5000).pipe(z.string().min(10, "Please write at least 10 characters")),
  turnstileToken,
});

export const newsletterSchema = z.object({ email, turnstileToken });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(128),
  turnstileToken,
  next: z.string().optional(),
});

export const magicLinkSchema = z.object({ email, turnstileToken, next: z.string().optional() });

export const signupSchema = z.object({
  fullName: clean(100).pipe(z.string().min(2, "Please enter your name")),
  email,
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(128)
    .regex(/[a-zA-Z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
  turnstileToken,
});

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export const checkoutSchema = z.object({
  email: email.optional().or(z.literal("")),
  shippingRegion: z.enum(US_STATES, { message: "Choose the state you are shipping to" }),
  liveAnimalAck: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  turnstileToken,
});

export const addressSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  full_name: clean(100).pipe(z.string().min(2, "Enter the recipient's name")),
  line1: clean(200).pipe(z.string().min(3, "Enter a street address")),
  line2: clean(200).optional(),
  city: clean(100).pipe(z.string().min(2, "Enter a city")),
  region: z.enum(US_STATES, { message: "Choose a state" }),
  postal_code: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code"),
  phone: clean(30).optional(),
  is_default: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export const profileSchema = z.object({
  full_name: clean(100).pipe(z.string().min(2)),
  phone: clean(30).optional(),
});

export const reviewSchema = z.object({
  productSlug: slug,
  rating: z.coerce.number().int().min(1).max(5),
  title: clean(120).pipe(z.string().min(3, "Add a short title")),
  body: multiline(4000).pipe(z.string().min(20, "Please write at least 20 characters")),
});

/** Only allow same-site relative redirects (prevents open redirects after login). */
export function safeRedirect(path: string | null | undefined, fallback = "/account") {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}

export type FormState = { ok: boolean; message?: string; errors?: Record<string, string[] | undefined> } | null;

export function fieldErrors(error: z.ZodError): FormState {
  return { ok: false, errors: z.flattenError(error).fieldErrors as Record<string, string[]>, message: "Please fix the highlighted fields." };
}
