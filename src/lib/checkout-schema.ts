import { z } from "zod";
import { COUNTRIES, NO_POSTAL_CODE, REGIONS } from "@/config/countries";
import { enabledPaymentMethods } from "@/config/payments";
import { siteConfig } from "@/config/site";
import { liveAnimalShippingProblem } from "@/lib/pricing";

/**
 * Checkout validation, shared by the browser (instant field errors) and the server (the source of
 * truth: everything is validated again when the order is placed). The schema depends on the cart:
 * live animals add a delivery date, two confirmations and the destination rules.
 */

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max, `Keep this under ${max} characters`));

/** International format: + then country code and number, e.g. +1 512 555 0134. */
const phone = z
  .string()
  .trim()
  .refine((v) => /^\+[0-9][0-9 ()-]{6,22}$/.test(v) && v.replace(/\D/g, "").length >= 8 && v.replace(/\D/g, "").length <= 15, {
    message: "Include your country code, e.g. +1 512 555 0134",
  });

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

/** Countries where State / Region is required (and chosen from a list). */
export const regionRequired = (country: string) => country in REGIONS;
export const postalCodeRequired = (country: string) => !NO_POSTAL_CODE.has(country);

export type CheckoutContext = { containsLiveAnimals: boolean; deliveryDates: readonly string[] };

export function checkoutSchema(ctx: CheckoutContext) {
  return z
    .object({
      savedAddressId: z.string().max(64).optional().default(""),
      fullName: text(100).pipe(z.string().min(2, "Enter your full name")),
      email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(254)),
      phone,
      company: text(100).optional().default(""),
      country: z.string().refine((c) => COUNTRY_CODES.has(c), "Select a country"),
      region: text(100).optional().default(""),
      city: text(100).pipe(z.string().min(2, "Enter your city")),
      address: text(300).pipe(z.string().min(3, "Enter your shipping address")),
      postalCode: z.string().trim().max(12, "Enter a valid postal code").optional().default(""),
      notes: text(1000).optional().default(""),
      saveAddress: z.boolean().optional().default(false),
      preferredDate: z.string().optional().default(""),
      ageConfirmed: z.boolean().optional().default(false),
      livePolicyAccepted: z.boolean().optional().default(false),
      paymentMethods: z.array(z.string()).max(20).optional().default([]),
      paymentOther: text(100).optional().default(""),
      turnstileToken: z.string().max(4096).optional().nullable(),
      /** The total the customer saw (before shipping); the order is rejected if the server's total differs. */
      expectedTotalCents: z.number().int().min(0),
    })
    .superRefine((v, ctx2) => {
      const issue = (path: string, message: string) => ctx2.addIssue({ code: "custom", path: [path], message });

      const regions = REGIONS[v.country];
      if (regions) {
        if (!regions.some((r) => r.code === v.region)) issue("region", v.country === "US" ? "Select your state" : "Select your state or province");
      }
      if (v.country === "US") {
        if (!/^\d{5}(-\d{4})?$/.test(v.postalCode)) issue("postalCode", "Enter a 5-digit ZIP code");
      } else if (v.country === "CA") {
        if (!/^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(v.postalCode)) issue("postalCode", "Enter a postal code like K1A 0B1");
      } else if (v.postalCode) {
        if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/.test(v.postalCode)) issue("postalCode", "Enter a valid postal code");
      } else if (postalCodeRequired(v.country)) {
        issue("postalCode", "Enter your postal code");
      }

      const enabled = enabledPaymentMethods();
      if (!v.paymentMethods.length) issue("paymentMethods", "Tick at least one way to pay");
      else if (v.paymentMethods.some((id) => !enabled.some((m) => m.id === id)) || new Set(v.paymentMethods).size !== v.paymentMethods.length) {
        issue("paymentMethods", "Choose from the payment methods listed");
      }
      const needsText = enabled.filter((m) => m.needsText).map((m) => m.id);
      if (v.paymentMethods.some((id) => needsText.includes(id)) && v.paymentOther.length < 2) issue("paymentOther", "Tell us which payment method you'd like to use");

      if (ctx.containsLiveAnimals) {
        const problem = liveAnimalShippingProblem(v.country, v.region);
        if (problem) issue(v.country === "US" ? "region" : "country", problem);
        if (!ctx.deliveryDates.includes(v.preferredDate)) issue("preferredDate", "Choose a delivery date");
        if (!v.ageConfirmed) issue("ageConfirmed", `You must be ${siteConfig.liveAnimals.minimumAge} or older to buy live animals`);
        if (!v.livePolicyAccepted) issue("livePolicyAccepted", "Please agree to the Live Animal Policy");
      }
    });
}

export type CheckoutInput = z.input<ReturnType<typeof checkoutSchema>>;
export type CheckoutData = z.output<ReturnType<typeof checkoutSchema>>;

/** Field → first error message, for showing next to each input. */
export function errorMap(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[issue.path.length - 1];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
