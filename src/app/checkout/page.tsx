import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { buttonVariants } from "@/components/ui/button";
import { COUNTRIES } from "@/config/countries";
import { getProfile } from "@/lib/auth/server";
import { getCart } from "@/lib/cart";
import { listAddresses } from "@/lib/db/account";
import { db } from "@/lib/db/pool";
import { liveDeliveryDates } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: "Checkout", description: "Place your order.", path: "/checkout", noIndex: true });

export default async function CheckoutPage() {
  const [cart, profile] = await Promise.all([getCart(), getProfile()]);
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
  const addresses = profile ? await listAddresses(db(), profile.id) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex gap-2">
          <li>
            <Link href="/cart" className="hover:text-foreground hover:underline">
              Cart
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-medium text-foreground">
            Checkout
          </li>
        </ol>
      </nav>
      <h1 className="mt-3 text-4xl font-semibold">Checkout</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">Secure checkout · Ships worldwide · Personal order confirmation</p>

      {cart.problems.length > 0 ? (
        <div role="alert" className="max-w-2xl space-y-3 rounded-xl bg-destructive/10 p-5 text-destructive">
          {cart.problems.map((p) => (
            <p key={p.slug + p.message}>{p.message}</p>
          ))}
          <Link href="/cart" className="font-medium underline">
            Update your cart
          </Link>
        </div>
      ) : (
        <CheckoutForm
          lines={cart.lines.map((l) => ({
            slug: l.slug,
            name: l.name,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents,
            lineTotalCents: l.lineTotalCents,
            image: l.product.image ? { url: l.product.image.thumbnail_url ?? l.product.image.url, alt: l.product.image.alt } : null,
          }))}
          totals={cart.totals}
          deliveryDates={cart.totals.containsLiveAnimals ? liveDeliveryDates() : []}
          user={profile ? { email: profile.email ?? "", name: profile.full_name, phone: profile.phone } : null}
          addresses={addresses}
          countries={COUNTRIES}
        />
      )}
    </div>
  );
}
