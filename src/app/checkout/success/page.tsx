import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { RefreshCart } from "@/components/cart/refresh-cart";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: "Thank you for your order", description: "Order confirmation.", path: "/checkout/success", noIndex: true });

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const sessionId = (await searchParams).session_id ?? "";
  const valid = /^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId);
  const { data: order } =
    valid && isServiceRoleConfigured()
      ? await createAdminClient().from("orders").select("order_number, status, total_cents, currency, email, contains_live_animals").eq("stripe_session_id", sessionId).maybeSingle()
      : { data: null };

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <RefreshCart />
      <CheckCircle2 className="mx-auto size-14 text-primary" aria-hidden />
      <h1 className="mt-4 text-4xl font-semibold">Thank you!</h1>
      {order ? (
        <div className="mt-4 space-y-3 text-lg">
          <p>
            Order <strong>{order.order_number}</strong> — {formatMoney(order.total_cents, order.currency)}
          </p>
          <p className="text-muted-foreground">
            {order.status === "pending"
              ? "We're confirming your payment. You'll get an email in a minute or two."
              : `A confirmation email is on its way to ${order.email}.`}
          </p>
          {order.contains_live_animals && (
            <p className="rounded-xl bg-sand/60 p-4 text-left text-base">
              We&apos;ll email you before your animal ships with the delivery date. Please make sure an adult is available to receive it.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-lg text-muted-foreground">Your payment was received. Check your email for the order confirmation.</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/account/orders" className={buttonVariants({ variant: "outline", size: "lg" })}>
          View orders
        </Link>
        <Link href="/shop" className={buttonVariants({ size: "lg" })}>
          Keep shopping
        </Link>
      </div>
    </div>
  );
}
