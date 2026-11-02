import Link from "next/link";
import { countryName, regionName } from "@/config/countries";
import { siteConfig } from "@/config/site";
import { formatDate, formatMoney } from "@/lib/format";
import { deliveryLabel, StatusBadge, type Order } from "@/lib/orders";

/** Shared by the customer order page and the admin order page. */
export function OrderDetail({ order, reviewLinks = false }: { order: Order; reviewLinks?: boolean }) {
  const a = order.shipping_address;
  const reviewable = reviewLinks && ["paid", "processing", "shipped", "delivered"].includes(order.status);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">Order {order.order_number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        Placed {formatDate(order.created_at)} · {order.email}
      </p>

      {order.tracking_number && (
        <p className="rounded-xl bg-sand/50 p-4 text-sm">
          Shipped{order.carrier ? ` with ${order.carrier}` : ""} — tracking number <strong>{order.tracking_number}</strong>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Item</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Price</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Qty</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-4 py-3">
                  <span className="font-medium">{i.product_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    SKU {i.sku}
                    {i.is_live_animal && " · Live animal"}
                  </span>
                  {reviewable && (
                    <Link href={`/account/reviews/new?product=${i.product_slug}`} className="text-xs font-medium text-primary underline">
                      Write a review
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{formatMoney(i.unit_price_cents, order.currency)}</td>
                <td className="px-4 py-3 text-right">{i.quantity}</td>
                <td className="px-4 py-3 text-right">{formatMoney(i.line_total_cents, order.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t text-sm">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right">Subtotal</td>
              <td className="px-4 py-2 text-right">{formatMoney(order.subtotal_cents, order.currency)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right">{deliveryLabel(order)}</td>
              <td className="px-4 py-2 text-right">
                {!order.shipping_confirmed ? "To be confirmed" : order.shipping_cents ? formatMoney(order.shipping_cents, order.currency) : "Free"}
              </td>
            </tr>
            {order.tax_cents > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right">{siteConfig.tax.label}</td>
                <td className="px-4 py-2 text-right">{formatMoney(order.tax_cents, order.currency)}</td>
              </tr>
            )}
            <tr className="font-semibold">
              <td colSpan={3} className="px-4 py-2 text-right">{order.shipping_confirmed ? "Total" : "Total (before shipping)"}</td>
              <td className="px-4 py-2 text-right">{formatMoney(order.total_cents, order.currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {a?.line1 && (
        <section aria-labelledby="ship-heading">
          <h2 id="ship-heading" className="mb-2 text-lg font-semibold">
            Shipping address
          </h2>
          <address className="text-sm not-italic">
            {a.name}
            {a.company && (
              <>
                <br />
                {a.company}
              </>
            )}
            <br />
            {a.line1}
            {a.line2 && (
              <>
                <br />
                {a.line2}
              </>
            )}
            <br />
            {[a.city, a.state ? regionName(a.country ?? "", a.state) : "", a.postal_code].filter(Boolean).join(", ")}
            <br />
            {countryName(a.country)}
          </address>
        </section>
      )}
    </div>
  );
}
