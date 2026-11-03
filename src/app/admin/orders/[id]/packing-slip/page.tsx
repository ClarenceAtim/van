import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { countryName, regionName } from "@/config/countries";
import { siteConfig } from "@/config/site";
import { requireAdmin } from "@/lib/admin";
import { getOrder } from "@/lib/db/orders";
import { formatDate } from "@/lib/format";
import { deliveryLabel } from "@/lib/orders";

export const metadata = { title: "Packing slip" };

/** Printable packing slip: items and address only, no prices. */
export default async function PackingSlip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { q } = await requireAdmin();
  const order = await getOrder(q, id);
  if (!order) notFound();
  const a = order.shipping_address;

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-8 text-black print:p-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold">{siteConfig.name}</p>
          <p className="text-sm">{siteConfig.contact.email}</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-lg font-semibold">Packing slip</p>
          <p>Order {order.order_number}</p>
          <p>{formatDate(order.created_at)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="font-semibold">Ship to</p>
          {a && (
            <p>
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
            </p>
          )}
          {order.phone && <p>{order.phone}</p>}
        </div>
        <div>
          <p className="font-semibold">Delivery</p>
          <p>{deliveryLabel(order)}</p>
          {order.preferred_delivery_date && <p>Preferred date: {formatDate(`${order.preferred_delivery_date}T12:00:00Z`)}</p>}
          {order.tracking_number && <p>Tracking: {order.tracking_number}</p>}
          {order.delivery_notes && <p className="mt-2 whitespace-pre-line">Notes: {order.delivery_notes}</p>}
        </div>
      </div>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="py-2">Packed</th>
            <th className="py-2">Item</th>
            <th className="py-2">SKU</th>
            <th className="py-2 text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items?.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-2">☐</td>
              <td className="py-2">
                {i.product_name}
                {i.is_live_animal && <strong> (LIVE ANIMAL)</strong>}
              </td>
              <td className="py-2">{i.sku}</td>
              <td className="py-2 text-right">{i.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {order.contains_live_animals && <p className="border-2 border-black p-3 text-sm font-semibold">LIVE ANIMAL: keep upright, protect from heat and cold, deliver overnight.</p>}
      <p className="text-sm">Thank you for your order! Questions? Reply to any of our emails or write to {siteConfig.contact.email}.</p>
      <PrintButton />
    </div>
  );
}
