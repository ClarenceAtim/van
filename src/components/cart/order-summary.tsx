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
          <dt>
            Subtotal ({totals.itemCount} {totals.itemCount === 1 ? "item" : "items"})
          </dt>
          <dd>{formatMoney(totals.subtotalCents)}</dd>
        </div>
        {siteConfig.tax.enabled && (
          <div className="flex justify-between">
            <dt>{siteConfig.tax.label}</dt>
            <dd>{formatMoney(totals.taxCents)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt>Shipping</dt>
          <dd className="text-right text-muted-foreground">Confirmed before you pay</dd>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <dt>Total (before shipping)</dt>
          <dd>{formatMoney(totals.totalCents)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Shipping depends on your country and is confirmed by email before you pay.
        {totals.containsLiveAnimals && ` Live animals ship overnight ${siteConfig.shipping.liveAnimalShipDays}.`}
      </p>
    </div>
  );
}
