"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { placeOrder } from "@/app/actions/checkout";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { REGIONS, type Country } from "@/config/countries";
import { groupedPaymentMethods, paymentSettings } from "@/config/payments";
import { siteConfig } from "@/config/site";
import { checkoutSchema, errorMap, postalCodeRequired, regionRequired } from "@/lib/checkout-schema";
import type { Address } from "@/lib/db/account";
import { formatMoney } from "@/lib/format";
import { liveAnimalShippingProblem } from "@/lib/pricing";

export type CheckoutLine = { slug: string; name: string; quantity: number; unitPriceCents: number; lineTotalCents: number; image: { url: string; alt: string } | null };

type Props = {
  lines: CheckoutLine[];
  totals: { subtotalCents: number; taxCents: number; totalCents: number; itemCount: number; containsLiveAnimals: boolean };
  deliveryDates: string[];
  user: { email: string; name: string | null; phone: string | null } | null;
  addresses: Address[];
  countries: Country[];
};

type Form = {
  savedAddressId: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  region: string;
  city: string;
  address: string;
  postalCode: string;
  notes: string;
  saveAddress: boolean;
  preferredDate: string;
  ageConfirmed: boolean;
  livePolicyAccepted: boolean;
  paymentMethods: string[];
  paymentOther: string;
};

const STORAGE_KEY = "sh_checkout_v2";
const hours = paymentSettings.confirmWithinHours;

const inputClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

const formatDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(siteConfig.locale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

function fromAddress(a: Address): Partial<Form> {
  return {
    savedAddressId: a.id,
    fullName: a.full_name,
    company: a.company ?? "",
    address: [a.line1, a.line2].filter(Boolean).join(", "),
    city: a.city,
    region: a.region ?? "",
    postalCode: a.postal_code ?? "",
    country: a.country || "US",
  };
}

function initialForm(p: Props): Form {
  const base: Form = {
    savedAddressId: "",
    fullName: p.user?.name ?? "",
    email: p.user?.email ?? "",
    phone: p.user?.phone ?? "",
    company: "",
    country: "",
    region: "",
    city: "",
    address: "",
    postalCode: "",
    notes: "",
    saveAddress: false,
    preferredDate: "",
    ageConfirmed: false,
    livePolicyAccepted: false,
    paymentMethods: [],
    paymentOther: "",
  };
  return p.addresses[0] ? { ...base, ...fromAddress(p.addresses[0]), fullName: p.addresses[0].full_name || base.fullName } : base;
}

/** Label + input + hint + error, wired together for screen readers. */
function Field({ id, label, required, optional, hint, error, children }: { id: string; label: string; required?: boolean; optional?: boolean; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span aria-hidden> *</span>}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </label>
      {children}
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

const describedBy = (id: string, error?: string, hint?: boolean) => [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

function CheckBox({ id, checked, onChange, error, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; error?: string; children: ReactNode }) {
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

export function CheckoutForm(p: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => initialForm(p));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const live = p.totals.containsLiveAnimals;

  // Restore what was typed before a refresh.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Form> | null;
      if (saved) setForm((f) => ({ ...f, ...saved, preferredDate: p.deliveryDates.includes(saved.preferredDate ?? "") ? saved.preferredDate! : "" }));
    } catch {
      /* storage unavailable */
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form, restored]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setErrors((e) => (key in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));
    setForm((f) => ({ ...f, [key]: value }));
  };

  const regions = REGIONS[form.country];
  const groups = useMemo(() => groupedPaymentMethods(form.country), [form.country]);
  const liveProblem = live ? liveAnimalShippingProblem(form.country, form.region) : null;
  const otherTicked = form.paymentMethods.includes("other");

  /** Moves focus to the first field with an error, in page order. */
  function focusFirstError() {
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
    });
  }

  function togglePayment(id: string, on: boolean) {
    set("paymentMethods", on ? [...form.paymentMethods, id] : form.paymentMethods.filter((m) => m !== id));
    if (!on && id === "other") set("paymentOther", "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const values = { ...form, turnstileToken: token, expectedTotalCents: p.totals.totalCents };
    const check = checkoutSchema({ containsLiveAnimals: live, deliveryDates: p.deliveryDates }).safeParse(values);
    if (!check.success) {
      setErrors(errorMap(check.error));
      setMessage("Please check the highlighted fields.");
      focusFirstError();
      return;
    }
    setPending(true);
    try {
      const res = await placeOrder(values);
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
        setErrors(res.errors ?? {});
        setMessage(res.message);
        if (res.errors && Object.keys(res.errors).length) focusFirstError();
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setMessage("Something went wrong placing your order. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const placeButton = (
    <div className="space-y-2">
      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pending || !!liveProblem}>
        <Lock aria-hidden /> {pending ? "Placing order…" : "Place Order"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Your details are sent securely. We confirm within {hours} hours.</p>
    </div>
  );

  const summary = <OrderSummary lines={p.lines} totals={p.totals} />;

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      {/* Mobile: collapsible summary at the top */}
      <details className="rounded-2xl border bg-card lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            Show order summary <ChevronDown className="size-4" aria-hidden />
          </span>
          <span className="font-semibold">{formatMoney(p.totals.totalCents)}</span>
        </summary>
        <div className="border-t p-4">{summary}</div>
      </details>

      <div className="min-w-0 space-y-10">
        {message && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {message}
          </p>
        )}

        <section aria-labelledby="shipping-heading" className="space-y-5">
          <div>
            <h2 id="shipping-heading" className="text-2xl font-semibold">
              Shipping details
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Tell us where to send your order. Fields marked * are required.</p>
            {!p.user && (
              <p className="mt-1 text-sm text-muted-foreground">
                Have an account?{" "}
                <Link href="/login?next=/checkout" className="font-medium text-primary underline">
                  Sign in
                </Link>{" "}
                to use your saved details. Or just continue as a guest.
              </p>
            )}
          </div>

          {p.addresses.length > 0 && (
            <Field id="co-saved" label="Saved addresses">
              <select
                id="co-saved"
                value={form.savedAddressId}
                onChange={(e) => {
                  const a = p.addresses.find((x) => x.id === e.target.value);
                  setErrors({});
                  setForm((f) => (a ? { ...f, ...fromAddress(a), saveAddress: false } : { ...f, savedAddressId: "", company: "", address: "", city: "", region: "", postalCode: "" }));
                }}
                className={inputClass}
              >
                {p.addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}, {a.line1}, {a.city}
                  </option>
                ))}
                <option value="">Use a new address</option>
              </select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="co-fullName" label="Full name" required error={errors.fullName}>
                <input id="co-fullName" name="name" autoComplete="name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={!!errors.fullName} aria-describedby={describedBy("co-fullName", errors.fullName)} aria-required className={inputClass} />
              </Field>
            </div>
            <Field id="co-email" label="Email address" required error={errors.email}>
              <input id="co-email" name="email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby={describedBy("co-email", errors.email)} aria-required className={inputClass} />
            </Field>
            <Field id="co-phone" label="Phone number" required hint="Include your country code, e.g. +1 or +44." error={errors.phone}>
              <input id="co-phone" name="tel" type="tel" inputMode="tel" autoComplete="tel" placeholder="+1 512 555 0134" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} aria-describedby={describedBy("co-phone", errors.phone, true)} aria-required className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field id="co-company" label="Company" optional>
                <input id="co-company" name="organization" autoComplete="organization" value={form.company} onChange={(e) => set("company", e.target.value)} className={inputClass} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field id="co-country" label="Country" required error={errors.country}>
                <select
                  id="co-country"
                  name="country"
                  autoComplete="country"
                  value={form.country}
                  onChange={(e) => {
                    set("country", e.target.value);
                    set("region", "");
                  }}
                  aria-invalid={!!errors.country}
                  aria-describedby={describedBy("co-country", errors.country)}
                  aria-required
                  className={inputClass}
                >
                  <option value="">Select a country…</option>
                  {p.countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {regions ? (
              <Field id="co-region" label={form.country === "US" ? "State" : form.country === "CA" ? "Province / territory" : "State / territory"} required error={errors.region}>
                <select id="co-region" name="region" autoComplete="address-level1" value={form.region} onChange={(e) => set("region", e.target.value)} aria-invalid={!!errors.region} aria-describedby={describedBy("co-region", errors.region)} aria-required className={inputClass}>
                  <option value="">Select…</option>
                  {regions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field id="co-region" label="State / Region" optional error={errors.region}>
                <input id="co-region" name="region" autoComplete="address-level1" value={form.region} onChange={(e) => set("region", e.target.value)} aria-invalid={!!errors.region} className={inputClass} />
              </Field>
            )}
            <Field id="co-city" label="City" required error={errors.city}>
              <input id="co-city" name="city" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} aria-invalid={!!errors.city} aria-describedby={describedBy("co-city", errors.city)} aria-required className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field id="co-address" label="Shipping address" required hint="Street, house number and apartment or suite." error={errors.address}>
                <input id="co-address" name="street-address" autoComplete="street-address" value={form.address} onChange={(e) => set("address", e.target.value)} aria-invalid={!!errors.address} aria-describedby={describedBy("co-address", errors.address, true)} aria-required className={inputClass} />
              </Field>
            </div>
            <Field
              id="co-postalCode"
              label={form.country === "US" ? "ZIP code" : "Postal code / ZIP code"}
              required={!form.country || postalCodeRequired(form.country)}
              optional={!!form.country && !postalCodeRequired(form.country)}
              error={errors.postalCode}
            >
              <input id="co-postalCode" name="postal-code" autoComplete="postal-code" inputMode={form.country === "US" ? "numeric" : "text"} value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} aria-invalid={!!errors.postalCode} aria-describedby={describedBy("co-postalCode", errors.postalCode)} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field id="co-notes" label="Order notes" optional error={errors.notes}>
                <textarea id="co-notes" name="notes" rows={3} maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Delivery instructions, gate code, questions…" className={`${inputClass} h-auto py-2`} />
              </Field>
            </div>
          </div>
          {p.user && !form.savedAddressId && (
            <CheckBox id="co-saveAddress" checked={form.saveAddress} onChange={(v) => set("saveAddress", v)}>
              Save this address to my account
            </CheckBox>
          )}
        </section>

        {live && (
          <section aria-labelledby="live-heading" className="space-y-4 rounded-2xl border border-sand-strong bg-sand/40 p-5">
            <h2 id="live-heading" className="text-xl font-semibold">
              Live animal delivery
            </h2>
            {liveProblem && (
              <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {liveProblem}
              </p>
            )}
            <p className="text-sm">Live animals ship overnight. We may delay shipping in extreme weather to keep your animal safe.</p>
            <Field id="co-preferredDate" label="Preferred delivery date" required hint={`Weekdays only. Animals ship ${siteConfig.shipping.liveAnimalShipDays} for next-day delivery.`} error={errors.preferredDate}>
              <select id="co-preferredDate" value={form.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} aria-invalid={!!errors.preferredDate} aria-describedby={describedBy("co-preferredDate", errors.preferredDate, true)} aria-required className={inputClass}>
                <option value="">Choose a date…</option>
                {p.deliveryDates.map((d) => (
                  <option key={d} value={d}>
                    {formatDay(d)}
                  </option>
                ))}
              </select>
            </Field>
            <CheckBox id="co-ageConfirmed" checked={form.ageConfirmed} onChange={(v) => set("ageConfirmed", v)} error={errors.ageConfirmed}>
              I am {siteConfig.liveAnimals.minimumAge} or older <span aria-hidden>*</span>
            </CheckBox>
            <CheckBox id="co-livePolicyAccepted" checked={form.livePolicyAccepted} onChange={(v) => set("livePolicyAccepted", v)} error={errors.livePolicyAccepted}>
              I agree to the{" "}
              <Link href="/terms#live-animals" target="_blank" className="font-medium text-primary underline">
                Live Animal Policy
              </Link>{" "}
              <span aria-hidden>*</span>
            </CheckBox>
          </section>
        )}

        <section aria-labelledby="payment-heading" className="space-y-5">
          <div>
            <h2 id="payment-heading" className="text-2xl font-semibold">
              How would you like to pay? <span aria-hidden>*</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tick one or more. You do not pay on this website and we never ask for card or bank details here. After you place your order we email you the payment details for
              the method you choose, usually within {hours} hours.
            </p>
          </div>
          <fieldset aria-describedby={errors.paymentMethods ? "co-paymentMethods-error" : undefined} className="space-y-6">
            <legend className="sr-only">Payment methods</legend>
            {groups.map((g) => (
              <div key={g.id} className="space-y-2">
                <h3 className="font-sans text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.label}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.methods.map((m, i) => {
                    const checked = form.paymentMethods.includes(m.id);
                    const first = g === groups[0] && i === 0;
                    return (
                      <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 ${checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                        <input
                          type="checkbox"
                          name="paymentMethods"
                          value={m.id}
                          checked={checked}
                          onChange={(e) => togglePayment(m.id, e.target.checked)}
                          aria-invalid={first && !!errors.paymentMethods}
                          className="mt-0.5 size-5 shrink-0 accent-primary"
                        />
                        <span>
                          <span className="block text-sm font-medium">{m.name}</span>
                          <span className="block text-xs text-muted-foreground">{m.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </fieldset>
          {errors.paymentMethods && (
            <p id="co-paymentMethods-error" className="text-sm text-destructive">
              {errors.paymentMethods}
            </p>
          )}
          {otherTicked && (
            <Field id="co-paymentOther" label="Which payment method would you like to use?" required error={errors.paymentOther}>
              <input id="co-paymentOther" value={form.paymentOther} onChange={(e) => set("paymentOther", e.target.value)} maxLength={100} placeholder="e.g. Western Union" aria-invalid={!!errors.paymentOther} aria-describedby={describedBy("co-paymentOther", errors.paymentOther)} aria-required className={inputClass} />
            </Field>
          )}
        </section>

        <Turnstile onToken={setToken} />
        <div className="lg:hidden">{placeButton}</div>
      </div>

      <aside aria-label="Your order" className="hidden lg:block">
        <div className="sticky top-24 space-y-5 rounded-2xl border bg-card p-6">
          {summary}
          {placeButton}
        </div>
      </aside>
    </form>
  );
}

function OrderSummary({ lines, totals }: Pick<Props, "lines" | "totals">) {
  const tax = siteConfig.tax;
  return (
    <div className="space-y-4">
      <h2 className="font-sans text-lg font-semibold">Your order</h2>
      <ul className="space-y-3">
        {lines.map((l) => (
          <li key={l.slug} className="flex gap-3 text-sm">
            <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {l.image && <Image src={l.image.url} alt={l.image.alt} fill sizes="64px" className="object-cover" />}
              <span className="absolute top-0.5 right-0.5 rounded-full bg-foreground/80 px-1.5 text-[11px] font-semibold text-background" aria-hidden>
                {l.quantity}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{l.name}</span>
              <span className="block text-xs text-muted-foreground">
                Qty {l.quantity} × {formatMoney(l.unitPriceCents)}
              </span>
            </span>
            <span className="shrink-0 font-medium">{formatMoney(l.lineTotalCents)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <dt>
            Subtotal ({totals.itemCount} {totals.itemCount === 1 ? "item" : "items"})
          </dt>
          <dd>{formatMoney(totals.subtotalCents)}</dd>
        </div>
        {tax.enabled && (
          <div className="flex justify-between">
            <dt>{tax.label}</dt>
            <dd>{formatMoney(totals.taxCents)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt>Shipping</dt>
          <dd className="text-right text-muted-foreground">Confirmed before you pay</dd>
        </div>
        <div className="flex justify-between border-t pt-3 text-base font-semibold">
          <dt>Total (before shipping)</dt>
          <dd>{formatMoney(totals.totalCents)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Shipping depends on your country and is confirmed before you pay.{tax.enabled && tax.note ? ` ${tax.note}` : ""}
      </p>
    </div>
  );
}
