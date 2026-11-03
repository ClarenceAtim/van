/**
 * How customers can pay. No payment is taken on the website: at checkout the customer ticks one or
 * more methods, and you email the payment details for one of them from /admin → Orders.
 *
 * - Add a method: copy an entry, give it a new unique `id` (lowercase, letters/numbers/dashes) and a
 *   `group`. Then fill in its details in /admin → Settings → Payment templates.
 * - Remove or pause one: set `enabled: false` (old orders that chose it still show its name).
 * - Rename: change `name` / `description`; keep the `id`, because orders and templates use it.
 * - Reorder: methods are shown in the order of this list, within their group.
 *
 * Your account numbers, usernames and links go in the payment templates (stored in the database,
 * admin only). Never put them in this file: everything here is shown on the website.
 *
 * `kind: "manual"` means "we email instructions". To connect an online payment provider later, add a
 * method with a different kind and handle it in placeOrder (src/app/actions/checkout.ts).
 */

export type PaymentGroupId = "us" | "europe" | "worldwide";

export type TemplateField = { key: string; label: string; placeholder?: string };

export type PaymentMethod = {
  id: string;
  name: string;
  description: string;
  group: PaymentGroupId;
  enabled: boolean;
  kind: "manual";
  /** The customer must type something when they tick it (used by "Other"). */
  needsText?: boolean;
  /** Your details for this method, entered in /admin → Settings → Payment templates. */
  fields: TemplateField[];
};

export const paymentGroups: { id: PaymentGroupId; label: string }[] = [
  { id: "us", label: "United States" },
  { id: "europe", label: "Europe" },
  { id: "worldwide", label: "Worldwide" },
];

const link = (label = "Payment link"): TemplateField[] => [{ key: "link", label, placeholder: "https://…" }];

export const paymentMethods: PaymentMethod[] = [
  // United States
  { id: "zelle", name: "Zelle", description: "Send from your US bank app", group: "us", enabled: true, kind: "manual",
    fields: [{ key: "recipient", label: "Zelle email or phone" }, { key: "name", label: "Name on the account" }] },
  { id: "cash-app", name: "Cash App", description: "Pay with your Cash App balance or card", group: "us", enabled: true, kind: "manual",
    fields: [{ key: "cashtag", label: "$Cashtag", placeholder: "$YourStore" }] },
  { id: "venmo", name: "Venmo", description: "Pay from your Venmo account", group: "us", enabled: true, kind: "manual",
    fields: [{ key: "username", label: "Venmo @username", placeholder: "@YourStore" }] },
  { id: "chime", name: "Chime", description: "Pay Anyone from your Chime account", group: "us", enabled: true, kind: "manual",
    fields: [{ key: "chimesign", label: "$ChimeSign", placeholder: "$YourStore" }] },
  { id: "apple-pay", name: "Apple Pay", description: "Pay from your iPhone or Apple Cash", group: "us", enabled: true, kind: "manual",
    fields: [{ key: "recipient", label: "Phone number or email for Apple Cash" }] },
  { id: "ach", name: "ACH bank transfer", description: "Direct transfer from a US bank account", group: "us", enabled: true, kind: "manual",
    fields: [{ key: "account_name", label: "Account name" }, { key: "bank", label: "Bank name" }, { key: "routing", label: "Routing number" }, { key: "account", label: "Account number" }] },
  // Europe
  { id: "sepa", name: "Bank transfer (SEPA / IBAN)", description: "Across Europe and worldwide", group: "europe", enabled: true, kind: "manual",
    fields: [{ key: "account_name", label: "Account name" }, { key: "iban", label: "IBAN" }, { key: "bic", label: "BIC / SWIFT" }, { key: "bank", label: "Bank name (optional)" }] },
  { id: "revolut", name: "Revolut", description: "Pay from your Revolut account", group: "europe", enabled: true, kind: "manual",
    fields: [{ key: "revtag", label: "@Revtag or phone number" }] },
  { id: "wise", name: "Wise", description: "Low-cost international transfer", group: "europe", enabled: true, kind: "manual",
    fields: [{ key: "recipient", label: "Wise email or account details" }] },
  { id: "ideal", name: "iDEAL", description: "Netherlands", group: "europe", enabled: true, kind: "manual", fields: link() },
  { id: "bancontact", name: "Bancontact", description: "Belgium", group: "europe", enabled: true, kind: "manual", fields: link() },
  // Worldwide
  { id: "paypal", name: "PayPal", description: "Pay from your PayPal balance or linked card", group: "worldwide", enabled: true, kind: "manual",
    fields: [{ key: "recipient", label: "PayPal email or PayPal.me link" }, { key: "note", label: "Instructions (optional)", placeholder: "Please choose Friends and Family" }] },
  { id: "card", name: "Credit or debit card", description: "Visa or Mastercard through a secure payment link", group: "worldwide", enabled: true, kind: "manual",
    fields: link("Card payment link") },
  { id: "other", name: "Other (tell us which)", description: "Use a different method? Type it in the box that opens", group: "worldwide", enabled: true, kind: "manual",
    needsText: true, fields: [{ key: "instructions", label: "Default instructions" }] },
];

export const paymentSettings = {
  /** "We'll email you … within X hours." Shown at checkout and in emails. */
  confirmWithinHours: 24,
  /** Unpaid orders are cancelled (and their stock released) this many days after the confirmation email. */
  payWithinDays: 3,
  /** A reminder email goes out this many days before that deadline. */
  reminderDaysBefore: 1,
};

/** Countries whose customers see the Europe group first (EU, EEA, UK, Switzerland and neighbours). */
const EUROPE = new Set(
  "AD AL AT BA BE BG CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS SE SI SK SM UA VA XK AX".split(" "),
);

export function groupForCountry(country: string | null | undefined): PaymentGroupId {
  if (country === "US") return "us";
  if (country && EUROPE.has(country)) return "europe";
  return "worldwide";
}

export const enabledPaymentMethods = () => paymentMethods.filter((m) => m.enabled);

/** Groups with their enabled methods; the customer's own region comes first, the rest keep their order. */
export function groupedPaymentMethods(country: string | null | undefined) {
  const first = groupForCountry(country);
  const groups = [...paymentGroups].sort((a, b) => Number(b.id === first) - Number(a.id === first));
  return groups.map((g) => ({ ...g, methods: enabledPaymentMethods().filter((m) => m.group === g.id) })).filter((g) => g.methods.length);
}

export const paymentMethodName = (id: string | null | undefined) => paymentMethods.find((m) => m.id === id)?.name.replace(" (tell us which)", "") ?? id ?? "Not chosen";

/** "Zelle, PayPal or Other: Western Union" — for pages and emails. */
export function paymentMethodsLabel(ids: readonly string[] | null | undefined, other?: string | null) {
  if (!ids?.length) return "Not chosen";
  return ids.map((id) => (id === "other" && other ? `Other: ${other}` : paymentMethodName(id))).join(", ");
}
