import { siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/format";
import type { OrderTotals } from "@/lib/pricing";

/** Server-calculated totals. Works in server and client components. */
export function OrderSummary({ totals }: { totals: OrderTotals }) {
  return (
    <div className="space-y-3">
      <h2 className="font-sans text-lg font-semibold">Order summary</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatMoney(totals.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>{totals.shippingLabel || "Shipping"}</dt>
          <dd>{totals.shippingCents === 0 ? "Free" : formatMoney(totals.shippingCents)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Tax</dt>
          <dd>Calculated at payment</dd>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <dt>Estimated total</dt>
          <dd>{formatMoney(totals.totalCents)}</dd>
        </div>
      </dl>
      {totals.containsLiveAnimals ? (
        <p className="text-xs text-muted-foreground">
          Live animals ship overnight {siteConfig.shipping.liveAnimalShipDays}. One overnight box covers your whole order.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Free standard shipping on supply orders over {formatMoney(siteConfig.shipping.freeStandardOverCents)}.</p>
      )}
    </div>
  );
}
