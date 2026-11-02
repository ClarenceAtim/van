import { z } from "zod";
import { enabledPaymentMethods } from "@/config/payments";
import { siteConfig } from "@/config/site";
import { US_STATES } from "@/lib/validation";

/**
 * Checkout validation, shared by the browser (instant field errors) and the server (the source of
 * truth: every step is validated again when the order is placed).
 */

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max, `Keep this under ${max} characters`));

const optionalText = (max: number) => text(max).optional().default("");

/** International format: + then country code and number, e.g. +1 512 555 0134. */
const phone = z
  .string()
  .trim()
  .refine((v) => /^\+[0-9][0-9 ()-]{6,22}$/.test(v) && v.replace(/\D/g, "").length >= 8 && v.replace(/\D/g, "").length <= 15, {
    message: "Include your country code, e.g. +1 512 555 0134",
  });

const COUNTRY_CODES = siteConfig.shippingCountries.map((c) => c.code) as [string, ...string[]];

export const contactSchema = z
  .object({
    savedAddressId: z.string().optional().default(""),
    fullName: text(100).pipe(z.string().min(2, "Enter your full name")),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(254)),
    confirmEmail: z.string().trim().toLowerCase(),
    phone,
    whatsapp: z.union([z.literal(""), phone]).optional().default(""),
    country: z.enum(COUNTRY_CODES, { message: "Choose a country we ship to" }),
    line1: text(200).pipe(z.string().min(3, "Enter your street address")),
    line2: optionalText(200),
    city: text(100).pipe(z.string().min(2, "Enter your city")),
    region: text(100).pipe(z.string().min(2, "Enter your state or region")),
    postalCode: z.string().trim().max(12),
    deliveryNotes: optionalText(500),
    saveAddress: z.boolean().optional().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.confirmEmail !== v.email) ctx.addIssue({ code: "custom", path: ["confirmEmail"], message: "Email addresses don't match" });
    if (v.country === "US") {
      if (!(US_STATES as readonly string[]).includes(v.region)) ctx.addIssue({ code: "custom", path: ["region"], message: "Choose your state" });
      if (!/^\d{5}(-\d{4})?$/.test(v.postalCode)) ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Enter a 5-digit ZIP code" });
    } else if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,10}$/.test(v.postalCode)) {
      ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Enter your postal code" });
    }
  });

export const deliverySchema = z.object({
  deliveryMethod: z.string().min(1, "Choose a delivery method"),
  preferredDate: z.string().optional().default(""),
  ageConfirmed: z.boolean().optional().default(false),
  livePolicyAccepted: z.boolean().optional().default(false),
});

export const paymentSchema = z.object({
  paymentMethod: z.string().refine((id) => enabledPaymentMethods().some((m) => m.id === id), { message: "Choose how you'd like to pay" }),
});

export const reviewSchema = z.object({
  termsAccepted: z.literal(true, { message: "Please accept the Terms of Service" }),
  turnstileToken: z.string().max(4096).optional().nullable(),
  /** The total the customer saw on the review step; the order is rejected if the server's total differs. */
  expectedTotalCents: z.number().int().min(0),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;
export type DeliveryData = z.output<typeof deliverySchema>;
export type PaymentData = z.output<typeof paymentSchema>;

export const placeOrderSchema = z.object({
  contact: contactSchema,
  delivery: deliverySchema,
  payment: paymentSchema,
  review: reviewSchema,
});
export type PlaceOrderInput = z.input<typeof placeOrderSchema>;
export type PlaceOrderData = z.output<typeof placeOrderSchema>;

/** Field → first error message, for showing next to each input. */
export function errorMap(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[issue.path.length - 1];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
