/**
 * How customers can pay. No payment is taken on the website: the customer picks a method at
 * checkout, and you email them the payment details for it from /admin → Orders.
 *
 * To add a method, copy one of the entries below and give it a new, unique `id` (lowercase,
 * letters/numbers/dashes). To hide one, set `enabled: false` (old orders that used it still show
 * its name). Your actual account details go in /admin → Settings → Payment templates, never here.
 *
 * `kind: "manual"` means "we email instructions". If you later connect an online payment provider,
 * add a method with `kind: "online"` and handle it in placeOrder (src/app/actions/checkout.ts).
 */
export type PaymentMethodIcon = "bank" | "paypal" | "zelle" | "cashapp" | "mobile" | "crypto";

export type PaymentMethod = {
  id: string;
  name: string;
  description: string;
  icon: PaymentMethodIcon;
  enabled: boolean;
  kind: "manual";
};

export const paymentMethods: PaymentMethod[] = [
  { id: "bank-transfer", name: "Bank transfer", description: "Pay from your bank account (ACH or wire).", icon: "bank", enabled: true, kind: "manual" },
  { id: "paypal", name: "PayPal", description: "Send the payment with your PayPal account.", icon: "paypal", enabled: true, kind: "manual" },
  { id: "zelle", name: "Zelle", description: "Instant bank-to-bank payment in the US.", icon: "zelle", enabled: true, kind: "manual" },
  { id: "cash-app", name: "Cash App", description: "Pay with Cash App to our $Cashtag.", icon: "cashapp", enabled: true, kind: "manual" },
  { id: "mobile-money", name: "Mobile Money", description: "Pay with your mobile money wallet.", icon: "mobile", enabled: true, kind: "manual" },
  { id: "crypto", name: "Cryptocurrency", description: "Pay with Bitcoin, USDT or another supported coin.", icon: "crypto", enabled: true, kind: "manual" },
];

export const paymentSettings = {
  /** "We'll email you the payment details within X hours." */
  detailsWithinHours: 24,
  /** Unpaid orders are cancelled (and their stock released) this many days after payment details are sent. */
  payWithinDays: 3,
  /** A reminder email goes out this many days before the deadline. */
  reminderDaysBefore: 1,
};

export const enabledPaymentMethods = () => paymentMethods.filter((m) => m.enabled);
export const paymentMethodName = (id: string | null | undefined) => paymentMethods.find((m) => m.id === id)?.name ?? id ?? "Not chosen";
