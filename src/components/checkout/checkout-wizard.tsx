"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Bitcoin, Check, DollarSign, Landmark, Pencil, Smartphone, Wallet, Zap, type LucideIcon } from "lucide-react";
import { getDeliveryStep, placeOrder, type DeliveryStep } from "@/app/actions/checkout";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import type { PaymentMethod, PaymentMethodIcon } from "@/config/payments";
import { siteConfig } from "@/config/site";
import { contactSchema, errorMap, paymentSchema, type ContactInput } from "@/lib/checkout-schema";
import { formatMoney } from "@/lib/format";
import type { Address } from "@/lib/db/account";

export type CheckoutLine = { slug: string; name: string; quantity: number; lineTotalCents: number; image: { url: string; alt: string } | null; isLiveAnimal: boolean };

type Props = {
  lines: CheckoutLine[];
  subtotalCents: number;
  containsLiveAnimals: boolean;
  cartKey: string;
  user: { email: string; name: string | null; phone: string | null } | null;
  addresses: Address[];
  countries: readonly { code: string; name: string }[];
  states: readonly string[];
  paymentMethods: PaymentMethod[];
  detailsWithinHours: number;
  minimumAge: number;
  liveAnimalShipDays: string;
};

type Contact = Required<{ [K in keyof ContactInput]: K extends "saveAddress" ? boolean : string }>;
type Delivery = { deliveryMethod: string; preferredDate: string; ageConfirmed: boolean; livePolicyAccepted: boolean };
type Saved = { cartKey: string; step: number; contact: Contact; delivery: Delivery; paymentMethod: string };

const STEPS = ["Contact & shipping", "Delivery", "Payment method", "Review"] as const;
const STORAGE_KEY = "sh_checkout_v1";

const ICONS: Record<PaymentMethodIcon, LucideIcon> = { bank: Landmark, paypal: Wallet, zelle: Zap, cashapp: DollarSign, mobile: Smartphone, crypto: Bitcoin };

const inputClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

function emptyContact(user: Props["user"], country: string): Contact {
  return {
    savedAddressId: "",
    fullName: user?.name ?? "",
    email: user?.email ?? "",
    confirmEmail: user?.email ?? "",
    phone: user?.phone ?? "",
    whatsapp: "",
    country,
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    deliveryNotes: "",
    saveAddress: false,
  };
}

/** Text input wired to a label, hint and error message. */
function TextField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  optional,
  ...rest
}: { label: string; name: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; optional?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const id = `${useId()}-${name}`;
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label} {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </label>
      <input id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={described} className={inputClass} {...rest} />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function CheckBox({ checked, onChange, error, children, name }: { checked: boolean; onChange: (v: boolean) => void; error?: string; children: ReactNode; name: string }) {
  const id = `${useId()}-${name}`;
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 text-sm">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className="mt-0.5 size-5 shrink-0 accent-primary" />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-1 pl-8 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const formatDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

export function CheckoutWizard(p: Props) {
  const router = useRouter();
  const defaultCountry = p.countries[0]?.code ?? "US";
  const [step, setStep] = useState(1);
  const [contact, setContact] = useState<Contact>(() => emptyContact(p.user, defaultCountry));
  const [delivery, setDelivery] = useState<Delivery>({ deliveryMethod: "", preferredDate: "", ageConfirmed: false, livePolicyAccepted: false });
  const [paymentMethod, setPaymentMethod] = useState("");
  const [terms, setTerms] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deliveryStep, setDeliveryStep] = useState<DeliveryStep | null>(null);
  const [restored, setRestored] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Restore progress after a refresh (only for the same cart contents).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Saved | null;
      if (saved && saved.cartKey === p.cartKey) {
        setContact({ ...emptyContact(p.user, defaultCountry), ...saved.contact });
        setDelivery(saved.delivery);
        setPaymentMethod(saved.paymentMethod);
        if (saved.step > 1) void goTo(Math.min(saved.step, 4), saved.contact);
      }
    } catch {
      /* storage unavailable: start fresh */
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      const saved: Saved = { cartKey: p.cartKey, step, contact, delivery, paymentMethod };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* ignore */
    }
  }, [restored, step, contact, delivery, paymentMethod, p.cartKey]);

  useEffect(() => {
    if (restored) headingRef.current?.focus();
  }, [step, restored]);

  /** Clears a field's error as soon as the customer changes it. */
  const clearError = (k: string) => setErrors((e) => (k in e ? Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)) : e));
  const setC = (k: keyof Contact) => (v: string | boolean) => {
    clearError(k);
    setContact((c) => ({ ...c, [k]: v }));
  };
  const setD = <K extends keyof Delivery>(k: K, v: Delivery[K]) => {
    clearError(k);
    setDelivery((d) => ({ ...d, [k]: v }));
  };
  const isUS = contact.country === "US";
  const option = deliveryStep?.options.find((o) => o.id === delivery.deliveryMethod) ?? null;
  const totalCents = p.subtotalCents + (option?.cents ?? 0);

  /** Loads delivery options for the address, then shows the step. */
  async function goTo(target: number, c: Contact = contact) {
    setMessage(null);
    setErrors({});
    if (target >= 2) {
      const ds = await getDeliveryStep(c.country, c.region);
      setDeliveryStep(ds);
      setDelivery((d) => {
        const valid = ds.options.some((o) => o.id === d.deliveryMethod) && !(ds.liveAnimalProblem && d.deliveryMethod === "live-overnight");
        const fallback = ds.options.find((o) => !(ds.liveAnimalProblem && o.id === "live-overnight"))?.id ?? "";
        return { ...d, deliveryMethod: valid ? d.deliveryMethod : fallback, preferredDate: ds.dates.includes(d.preferredDate) ? d.preferredDate : "" };
      });
    }
    setStep(target);
    window.scrollTo({ top: 0 });
  }

  function validateContact() {
    const r = contactSchema.safeParse(contact);
    if (!r.success) {
      setErrors(errorMap(r.error));
      setMessage("Please fix the highlighted fields.");
      return false;
    }
    return true;
  }

  function validateDelivery() {
    const e: Record<string, string> = {};
    if (!option) e.deliveryMethod = "Choose a delivery method";
    if (deliveryStep?.containsLiveAnimals) {
      if (delivery.deliveryMethod === "live-overnight") {
        if (deliveryStep.liveAnimalProblem) e.deliveryMethod = deliveryStep.liveAnimalProblem;
        if (!deliveryStep.dates.includes(delivery.preferredDate)) e.preferredDate = "Choose a delivery date";
      }
      if (!delivery.ageConfirmed) e.ageConfirmed = `You must be ${p.minimumAge} or older to buy live animals`;
      if (!delivery.livePolicyAccepted) e.livePolicyAccepted = "Please agree to the Live Animal Policy";
    }
    setErrors(e);
    if (Object.keys(e).length) setMessage("Please check the delivery details.");
    return !Object.keys(e).length;
  }

  function validatePayment() {
    const r = paymentSchema.safeParse({ paymentMethod });
    if (!r.success) {
      setErrors(errorMap(r.error));
      setMessage("Choose how you'd like to pay.");
      return false;
    }
    return true;
  }

  async function next() {
    setPending(true);
    try {
      if (step === 1 && validateContact()) await goTo(2);
      else if (step === 2 && validateDelivery()) await goTo(3);
      else if (step === 3 && validatePayment()) await goTo(4);
    } finally {
      setPending(false);
    }
  }

  async function submit() {
    if (!terms) {
      setErrors({ termsAccepted: "Please accept the Terms of Service" });
      setMessage("Please accept the Terms of Service.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const res = await placeOrder({
        contact,
        delivery,
        payment: { paymentMethod },
        review: { termsAccepted: true, turnstileToken: token, expectedTotalCents: totalCents },
      });
      if (res.ok && "confirmationUrl" in res && res.confirmationUrl) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new Event("cart:changed"));
        router.push(res.confirmationUrl);
        return;
      }
      if (!res.ok) {
        const target = { contact: 1, delivery: 2, payment: 3, review: 4 }[res.step ?? "review"];
        if (target !== step) await goTo(target);
        setErrors(res.errors ?? {});
        setMessage(res.message);
      }
    } catch {
      setMessage("Something went wrong placing your order. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const methodName = p.paymentMethods.find((m) => m.id === paymentMethod)?.name ?? "";
  const country = p.countries.find((c) => c.code === contact.country)?.name ?? contact.country;

  return (
    <div>
      <nav aria-label="Checkout progress" className="mb-8">
        <ol className="grid grid-cols-4 gap-2">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            return (
              <li key={label} aria-current={n === step ? "step" : undefined} className="space-y-1.5">
                <span className={`block h-1.5 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`} />
                <span className={`flex items-center gap-1 text-xs sm:text-sm ${n === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {done && <Check className="size-3.5 text-primary" aria-hidden />}
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">Step {n}</span>
                  {done && <span className="sr-only"> (completed)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <h2 ref={headingRef} tabIndex={-1} className="mb-5 text-2xl font-semibold outline-none">
        <span className="sr-only">Step {step} of 4: </span>
        {STEPS[step - 1]}
      </h2>

      {message && (
        <p role="alert" className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {message}
        </p>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void (step === 4 ? submit() : next());
        }}
        className="space-y-6"
      >
        {step === 1 && (
          <>
            {p.user ? (
              <p className="text-sm text-muted-foreground">Signed in as {p.user.email}.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Checking out as a guest.{" "}
                <Link href="/login?next=/checkout" className="font-medium text-primary underline">
                  Sign in
                </Link>{" "}
                to use your saved addresses.
              </p>
            )}

            {p.addresses.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-medium">Saved addresses</legend>
                {p.addresses.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${contact.savedAddressId === a.id ? "border-primary bg-primary/5" : ""}`}>
                    <input
                      type="radio"
                      name="savedAddress"
                      checked={contact.savedAddressId === a.id}
                      onChange={() =>
                        setContact((c) => ({
                          ...c,
                          savedAddressId: a.id,
                          fullName: a.full_name,
                          line1: a.line1,
                          line2: a.line2 ?? "",
                          city: a.city,
                          region: a.region,
                          postalCode: a.postal_code,
                          country: "US",
                          phone: a.phone || c.phone,
                          saveAddress: false,
                        }))
                      }
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span>
                      <strong>{a.full_name}</strong>
                      <br />
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.region} {a.postal_code}
                    </span>
                  </label>
                ))}
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${!contact.savedAddressId ? "border-primary bg-primary/5" : ""}`}>
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={!contact.savedAddressId}
                    onChange={() => setContact((c) => ({ ...c, savedAddressId: "", line1: "", line2: "", city: "", region: "", postalCode: "" }))}
                    className="size-4 accent-primary"
                  />
                  Use a new address
                </label>
              </fieldset>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField label="Full name" name="name" autoComplete="name" value={contact.fullName} onChange={setC("fullName")} error={errors.fullName} required />
              </div>
              <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" value={contact.email} onChange={setC("email")} error={errors.email} required />
              <TextField label="Confirm email" name="confirmEmail" type="email" autoComplete="email" inputMode="email" value={contact.confirmEmail} onChange={setC("confirmEmail")} error={errors.confirmEmail} required onPaste={undefined} />
              <TextField label="Phone" name="tel" type="tel" autoComplete="tel" inputMode="tel" placeholder="+1 512 555 0134" hint="Include your country code." value={contact.phone} onChange={setC("phone")} error={errors.phone} required />
              <TextField label="WhatsApp number" name="whatsapp" type="tel" inputMode="tel" optional placeholder="+1 512 555 0134" value={contact.whatsapp} onChange={setC("whatsapp")} error={errors.whatsapp} />
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="checkout-country" className="block text-sm font-medium">
                  Country
                </label>
                <select id="checkout-country" name="country" autoComplete="country" value={contact.country} onChange={(e) => setContact((c) => ({ ...c, country: e.target.value, region: "" }))} className={inputClass} aria-invalid={!!errors.country}>
                  {p.countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
              </div>
              <div className="sm:col-span-2">
                <TextField label="Street address" name="address-line1" autoComplete="address-line1" value={contact.line1} onChange={setC("line1")} error={errors.line1} required />
              </div>
              <div className="sm:col-span-2">
                <TextField label="Apartment, suite, etc." name="address-line2" autoComplete="address-line2" optional value={contact.line2} onChange={setC("line2")} error={errors.line2} />
              </div>
              <TextField label="City" name="city" autoComplete="address-level2" value={contact.city} onChange={setC("city")} error={errors.city} required />
              {isUS ? (
                <div className="space-y-1.5">
                  <label htmlFor="checkout-region" className="block text-sm font-medium">
                    State
                  </label>
                  <select id="checkout-region" name="state" autoComplete="address-level1" value={contact.region} onChange={(e) => setC("region")(e.target.value)} className={inputClass} aria-invalid={!!errors.region} aria-describedby={errors.region ? "checkout-region-error" : undefined}>
                    <option value="">Choose…</option>
                    {p.states.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {errors.region && (
                    <p id="checkout-region-error" className="text-sm text-destructive">
                      {errors.region}
                    </p>
                  )}
                </div>
              ) : (
                <TextField label="State / region" name="state" autoComplete="address-level1" value={contact.region} onChange={setC("region")} error={errors.region} required />
              )}
              <TextField label={isUS ? "ZIP code" : "Postal code"} name="postal-code" autoComplete="postal-code" inputMode={isUS ? "numeric" : "text"} value={contact.postalCode} onChange={setC("postalCode")} error={errors.postalCode} required />
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="checkout-notes" className="block text-sm font-medium">
                  Delivery notes <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea id="checkout-notes" name="notes" rows={3} maxLength={500} value={contact.deliveryNotes} onChange={(e) => setC("deliveryNotes")(e.target.value)} className={`${inputClass} h-auto py-2`} placeholder="Gate code, where to leave supplies…" />
                {errors.deliveryNotes && <p className="text-sm text-destructive">{errors.deliveryNotes}</p>}
              </div>
            </div>
            {p.user && !contact.savedAddressId && isUS && (
              <CheckBox name="saveAddress" checked={contact.saveAddress} onChange={setC("saveAddress")}>
                Save this address to my account
              </CheckBox>
            )}
          </>
        )}

        {step === 2 && deliveryStep && (
          <>
            {deliveryStep.liveAnimalProblem && (
              <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {deliveryStep.liveAnimalProblem}
              </p>
            )}
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Delivery method</legend>
              {deliveryStep.options.map((o) => {
                const blocked = o.id === "live-overnight" && !!deliveryStep.liveAnimalProblem;
                return (
                  <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${delivery.deliveryMethod === o.id ? "border-primary bg-primary/5" : ""} ${blocked ? "opacity-50" : ""}`}>
                    <input type="radio" name="deliveryMethod" value={o.id} disabled={blocked} checked={delivery.deliveryMethod === o.id} onChange={() => setD("deliveryMethod", o.id)} className="mt-1 size-4 accent-primary" />
                    <span className="flex-1">
                      <span className="flex justify-between gap-3 font-medium">
                        <span>{o.label}</span>
                        <span>{o.cents ? formatMoney(o.cents) : "Free"}</span>
                      </span>
                      <span className="block text-sm text-muted-foreground">{o.description}</span>
                    </span>
                  </label>
                );
              })}
              {errors.deliveryMethod && <p className="text-sm text-destructive">{errors.deliveryMethod}</p>}
              {!deliveryStep.containsLiveAnimals && deliveryStep.subtotalCents < siteConfig.shipping.freeStandardOverCents && (
                <p className="text-xs text-muted-foreground">Free standard shipping on supplies over {formatMoney(siteConfig.shipping.freeStandardOverCents)}.</p>
              )}
            </fieldset>

            {deliveryStep.containsLiveAnimals && (
              <fieldset className="space-y-4 rounded-xl border border-sand-strong bg-sand/40 p-4">
                <legend className="px-1 font-semibold">Live animals</legend>
                {delivery.deliveryMethod === "live-overnight" && (
                  <div className="space-y-1.5">
                    <label htmlFor="checkout-date" className="block text-sm font-medium">
                      Preferred delivery date
                    </label>
                    <select id="checkout-date" value={delivery.preferredDate} onChange={(e) => setD("preferredDate", e.target.value)} className={inputClass} aria-invalid={!!errors.preferredDate} aria-describedby="checkout-date-hint">
                      <option value="">Choose a date…</option>
                      {deliveryStep.dates.map((d) => (
                        <option key={d} value={d}>
                          {formatDay(d)}
                        </option>
                      ))}
                    </select>
                    <p id="checkout-date-hint" className="text-xs text-muted-foreground">
                      Animals ship {p.liveAnimalShipDays} for next-day delivery, after your payment arrives. Shipping may be delayed for extreme weather; we&apos;ll email you before we ship.
                    </p>
                    {errors.preferredDate && <p className="text-sm text-destructive">{errors.preferredDate}</p>}
                  </div>
                )}
                <CheckBox name="ageConfirmed" checked={delivery.ageConfirmed} onChange={(v) => setD("ageConfirmed", v)} error={errors.ageConfirmed}>
                  I am {p.minimumAge} or older.
                </CheckBox>
                <CheckBox name="livePolicyAccepted" checked={delivery.livePolicyAccepted} onChange={(v) => setD("livePolicyAccepted", v)} error={errors.livePolicyAccepted}>
                  I agree to the{" "}
                  <Link href="/terms#live-animals" target="_blank" className="font-medium text-primary underline">
                    Live Animal Policy
                  </Link>{" "}
                  and confirm this species is legal to keep where I live.
                </CheckBox>
              </fieldset>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-sm text-muted-foreground">Choose how you&apos;d like to pay. No payment is taken on this website.</legend>
              {p.paymentMethods.map((m) => {
                const Icon = ICONS[m.icon];
                return (
                  <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${paymentMethod === m.id ? "border-primary bg-primary/5" : ""}`}>
                    <input type="radio" name="paymentMethod" value={m.id} checked={paymentMethod === m.id} onChange={() => {
                        clearError("paymentMethod");
                        setPaymentMethod(m.id);
                      }} className="mt-1 size-4 accent-primary" />
                    <Icon className="mt-0.5 size-5 shrink-0 text-forest" aria-hidden />
                    <span>
                      <span className="block font-medium">{m.name}</span>
                      <span className="block text-sm text-muted-foreground">{m.description}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            {errors.paymentMethod && <p className="text-sm text-destructive">{errors.paymentMethod}</p>}
            <p className="rounded-xl bg-sand/60 p-4 text-sm">
              After you place your order, we&apos;ll email you the payment details for your chosen method within {p.detailsWithinHours} hours. Your order is reserved while you pay.
            </p>
          </>
        )}

        {step === 4 && (
          <>
            <section aria-labelledby="review-items" className="space-y-3">
              <h3 id="review-items" className="font-sans text-base font-semibold">
                Items
              </h3>
              <ul className="divide-y rounded-xl border">
                {p.lines.map((l) => (
                  <li key={l.slug} className="flex items-center gap-3 p-3 text-sm">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {l.image && <Image src={l.image.url} alt={l.image.alt} fill sizes="56px" className="object-cover" />}
                    </span>
                    <span className="flex-1">
                      {l.name} <span className="text-muted-foreground">× {l.quantity}</span>
                    </span>
                    <span>{formatMoney(l.lineTotalCents)}</span>
                  </li>
                ))}
              </ul>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(p.subtotalCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{option?.label ?? "Delivery"}</dt>
                  <dd>{option?.cents ? formatMoney(option.cents) : "Free"}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney(totalCents)}</dd>
                </div>
              </dl>
            </section>

            <ReviewBlock title="Shipping address" onEdit={() => void goTo(1)}>
              {contact.fullName}
              <br />
              {contact.line1}
              {contact.line2 ? `, ${contact.line2}` : ""}
              <br />
              {contact.city}, {contact.region} {contact.postalCode}, {country}
              <br />
              {contact.email} · {contact.phone}
              {contact.whatsapp ? ` · WhatsApp ${contact.whatsapp}` : ""}
            </ReviewBlock>
            <ReviewBlock title="Delivery" onEdit={() => void goTo(2)}>
              {option?.label}
              {delivery.deliveryMethod === "live-overnight" && delivery.preferredDate ? ` · preferred delivery ${formatDay(delivery.preferredDate)}` : ""}
            </ReviewBlock>
            <ReviewBlock title="Payment method" onEdit={() => void goTo(3)}>
              {methodName}. We&apos;ll email you the payment details within {p.detailsWithinHours} hours.
            </ReviewBlock>

            <CheckBox name="termsAccepted" checked={terms} onChange={(v) => {
                clearError("termsAccepted");
                setTerms(v);
              }} error={errors.termsAccepted}>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="font-medium text-primary underline">
                Terms of Service
              </Link>
              .
            </CheckBox>
            <Turnstile onToken={setToken} />
          </>
        )}

        <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between">
          {step > 1 ? (
            <Button type="button" variant="outline" size="lg" onClick={() => void goTo(step - 1)} disabled={pending}>
              Back
            </Button>
          ) : (
            <Link href="/cart" className="self-center text-sm font-medium text-primary underline">
              Back to cart
            </Link>
          )}
          <Button type="submit" size="lg" disabled={pending}>
            {step === 4 ? (pending ? "Placing order…" : "Place order") : pending ? "Loading…" : "Continue"}
          </Button>
        </div>
        {step === 4 && <p className="text-center text-xs text-muted-foreground">No payment is taken now. We&apos;ll email you how to pay.</p>}
      </form>
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="flex items-start justify-between gap-4 rounded-xl border p-4 text-sm">
      <div>
        <h3 className="mb-1 font-sans text-base font-semibold">{title}</h3>
        <p className="text-muted-foreground">{children}</p>
      </div>
      <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-sm font-medium text-primary underline" aria-label={`Edit ${title.toLowerCase()}`}>
        <Pencil className="size-3.5" aria-hidden /> Edit
      </button>
    </section>
  );
}
