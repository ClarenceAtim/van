import Link from "next/link";
import { CheckoutWizard } from "@/components/checkout/checkout-wizard";
import { buttonVariants } from "@/components/ui/button";
import { enabledPaymentMethods, paymentSettings } from "@/config/payments";
import { siteConfig } from "@/config/site";
import { getProfile } from "@/lib/auth/server";
import { getCart } from "@/lib/cart";
import { listAddresses } from "@/lib/db/account";
import { db } from "@/lib/db/pool";
import { formatMoney } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { US_STATES } from "@/lib/validation";

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
  // Saved progress is only restored while the cart still holds the same items.
  const cartKey = cart.lines.map((l) => `${l.slug}:${l.quantity}`).join(",");

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0">
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
          <CheckoutWizard
            lines={cart.lines.map((l) => ({
              slug: l.slug,
              name: l.name,
              quantity: l.quantity,
              lineTotalCents: l.lineTotalCents,
              isLiveAnimal: l.isLiveAnimal,
              image: l.product.image ? { url: l.product.image.thumbnail_url ?? l.product.image.url, alt: l.product.image.alt } : null,
            }))}
            subtotalCents={cart.totals.subtotalCents}
            containsLiveAnimals={cart.totals.containsLiveAnimals}
            cartKey={cartKey}
            user={profile ? { email: profile.email ?? "", name: profile.full_name, phone: profile.phone } : null}
            addresses={addresses}
            countries={siteConfig.shippingCountries}
            states={US_STATES}
            paymentMethods={enabledPaymentMethods()}
            detailsWithinHours={paymentSettings.detailsWithinHours}
            minimumAge={siteConfig.liveAnimals.minimumAge}
            liveAnimalShipDays={siteConfig.shipping.liveAnimalShipDays}
          />
        )}
      </div>
      <aside aria-label="Your cart" className="h-fit space-y-4 rounded-2xl border p-5 lg:sticky lg:top-24">
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
        <dl className="flex justify-between border-t pt-4 font-semibold">
          <dt>Subtotal</dt>
          <dd>{formatMoney(cart.totals.subtotalCents)}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">Delivery is chosen in step 2 and the total is shown before you place your order. No payment is taken on this website.</p>
      </aside>
    </div>
  );
}
