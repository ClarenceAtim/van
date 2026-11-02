import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Mail } from "lucide-react";
import { RefreshCart } from "@/components/cart/refresh-cart";
import { buttonVariants } from "@/components/ui/button";
import { countryName, regionName } from "@/config/countries";
import { paymentMethodsLabel, paymentSettings } from "@/config/payments";
import { siteConfig } from "@/config/site";
import { getUser } from "@/lib/auth/server";
import { getOrderByNumber } from "@/lib/db/orders";
import { db, isDatabaseConfigured } from "@/lib/db/pool";
import { formatMoney } from "@/lib/format";
import { verifyOrderToken } from "@/lib/order-token";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: "Order received", description: "Order confirmation.", path: "/checkout/confirmation", noIndex: true });

const formatDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(siteConfig.locale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/** Shown after "Place Order". Visible with the signed link from checkout, or to the signed-in customer. */
export default async function ConfirmationPage({ params, searchParams }: { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ orderNumber }, { t }] = await Promise.all([params, searchParams]);
  if (!/^SH-\d{4,}$/.test(orderNumber) || !isDatabaseConfigured()) notFound();
  const order = await getOrderByNumber(db(), orderNumber);
  if (!order) notFound();
  if (!verifyOrderToken(orderNumber, t)) {
    const user = await getUser();
    if (!user || user.id !== order.user_id) notFound();
  }
  const a = order.shipping_address;
  const money = (c: number) => formatMoney(c, order.currency);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <RefreshCart />
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" aria-hidden />
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          Thank you — your order <span className="whitespace-nowrap">{order.order_number}</span> has been received
        </h1>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-5">
        <Mail className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-semibold">We&apos;ll email you within {paymentSettings.confirmWithinHours} hours with your shipping cost and payment details.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll write to <strong>{order.email}</strong>. Nothing has been charged, and your items are reserved while you pay.
          </p>
        </div>
      </div>

      <section aria-labelledby="summary" className="mt-8 space-y-4 rounded-2xl border p-5">
        <h2 id="summary" className="font-sans text-lg font-semibold">
          Order summary
        </h2>
        <ul className="divide-y text-sm">
          {order.order_items?.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2">
              <span>
                {i.product_name} <span className="text-muted-foreground">× {i.quantity}</span>
              </span>
              <span>{money(i.line_total_cents)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{money(order.subtotal_cents)}</dd>
          </div>
          {order.tax_cents > 0 && (
            <div className="flex justify-between">
              <dt>{siteConfig.tax.label}</dt>
              <dd>{money(order.tax_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd className="text-muted-foreground">Confirmed before you pay</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total (before shipping)</dt>
            <dd>{money(order.total_cents)}</dd>
          </div>
        </dl>
        <dl className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium">You&apos;d like to pay by</dt>
            <dd className="text-muted-foreground">{paymentMethodsLabel(order.payment_methods, order.payment_other)}</dd>
          </div>
          {order.preferred_delivery_date && (
            <div>
              <dt className="font-medium">Preferred delivery date</dt>
              <dd className="text-muted-foreground">{formatDay(order.preferred_delivery_date)}</dd>
            </div>
          )}
          {a && (
            <div className="sm:col-span-2">
              <dt className="font-medium">Ship to</dt>
              <dd className="text-muted-foreground">
                {a.name}
                {a.company ? `, ${a.company}` : ""}, {a.line1}, {[a.city, a.state ? regionName(a.country ?? "", a.state) : "", a.postal_code].filter(Boolean).join(", ")},{" "}
                {countryName(a.country)}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {order.contains_live_animals && (
        <p className="mt-6 rounded-xl bg-sand/60 p-4 text-sm">
          Live animals ship overnight once your payment arrives. We may delay shipping in extreme weather to keep your animal safe, and we&apos;ll email you before it ships.
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {order.user_id && (
          <Link href={`/account/orders/${order.id}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            View order
          </Link>
        )}
        <Link href="/shop" className={buttonVariants({ size: "lg" })}>
          Keep shopping
        </Link>
      </div>
    </div>
  );
}
