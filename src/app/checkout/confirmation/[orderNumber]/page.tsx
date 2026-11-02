import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Mail } from "lucide-react";
import { RefreshCart } from "@/components/cart/refresh-cart";
import { buttonVariants } from "@/components/ui/button";
import { paymentMethodName, paymentSettings } from "@/config/payments";
import { getUser } from "@/lib/auth/server";
import { getOrderByNumber } from "@/lib/db/orders";
import { db, isDatabaseConfigured } from "@/lib/db/pool";
import { deliveryLabel } from "@/lib/orders";
import { formatMoney } from "@/lib/format";
import { verifyOrderToken } from "@/lib/order-token";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: "Order received", description: "Order confirmation.", path: "/checkout/confirmation", noIndex: true });

const formatDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/** Shown after "Place order". Visible with the signed link from checkout, or to the signed-in customer. */
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <RefreshCart />
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" aria-hidden />
        <h1 className="mt-4 text-4xl font-semibold">Thank you, your order is placed</h1>
        <p className="mt-3 text-lg">
          Order number <strong className="font-mono">{order.order_number}</strong>
        </p>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-5">
        <Mail className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-semibold">Check your email: we&apos;ll send payment details shortly.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Within {paymentSettings.detailsWithinHours} hours we&apos;ll email <strong>{order.email}</strong> how to pay by {paymentMethodName(order.payment_method)}. Your items are
            reserved while you pay. Nothing has been charged.
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
              <span>{formatMoney(i.unit_price_cents * i.quantity, order.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatMoney(order.subtotal_cents, order.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{deliveryLabel(order)}</dt>
            <dd>{order.shipping_cents ? formatMoney(order.shipping_cents, order.currency) : "Free"}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total to pay</dt>
            <dd>{formatMoney(order.total_cents, order.currency)}</dd>
          </div>
        </dl>
        <dl className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium">Payment method</dt>
            <dd className="text-muted-foreground">{paymentMethodName(order.payment_method)}</dd>
          </div>
          <div>
            <dt className="font-medium">Delivery</dt>
            <dd className="text-muted-foreground">
              {deliveryLabel(order)}
              {order.preferred_delivery_date && (
                <>
                  <br />
                  Preferred date: {formatDay(order.preferred_delivery_date)}
                </>
              )}
            </dd>
          </div>
          {a && (
            <div className="sm:col-span-2">
              <dt className="font-medium">Ship to</dt>
              <dd className="text-muted-foreground">
                {a.name}, {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.postal_code}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {order.contains_live_animals && (
        <p className="mt-6 rounded-xl bg-sand/60 p-4 text-sm">
          Live animals ship once your payment arrives. We&apos;ll email you before your animal ships; please make sure an adult is available to receive it. Extreme weather can delay
          shipping.
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
