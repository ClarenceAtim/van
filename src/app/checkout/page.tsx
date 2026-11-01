import Link from "next/link";
import { OrderSummary } from "@/components/cart/order-summary";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { buttonVariants } from "@/components/ui/button";
import { getCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: "Checkout", description: "Secure checkout.", path: "/checkout", noIndex: true });

export default async function CheckoutPage() {
  const [cart, user] = await Promise.all([getCart(), getUser()]);
  if (!cart.lines.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold">Your cart is empty</h1>
        <Link href="/shop" className={`${buttonVariants({ size: "lg" })} mt-6`}>
          Continue shopping
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-6 text-4xl font-semibold">Checkout</h1>
        {cart.problems.length > 0 ? (
          <div role="alert" className="space-y-3 rounded-xl bg-destructive/10 p-5 text-destructive">
            {cart.problems.map((p) => (
              <p key={p.slug + p.message}>{p.message}</p>
            ))}
            <Link href="/cart" className="font-medium underline">
              Update your cart
            </Link>
          </div>
        ) : (
          <CheckoutForm containsLiveAnimals={cart.totals.containsLiveAnimals} signedInEmail={user?.email ?? null} />
        )}
      </div>
      <aside aria-label="Order summary" className="h-fit space-y-4 rounded-2xl border p-5">
        <ul className="space-y-2 text-sm">
          {cart.lines.map((l) => (
            <li key={l.slug} className="flex justify-between gap-3">
              <span>
                {l.name} <span className="text-muted-foreground">× {l.quantity}</span>
              </span>
              <span className="shrink-0">{formatMoney(l.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t pt-4">
          <OrderSummary totals={cart.totals} />
        </div>
      </aside>
    </div>
  );
}
