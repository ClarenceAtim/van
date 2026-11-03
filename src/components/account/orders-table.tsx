import Link from "next/link";
import { paymentMethodsLabel } from "@/config/payments";
import { countryName } from "@/config/countries";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusBadge, type Order } from "@/lib/orders";

/** Customer and admin order lists. The admin view adds customer and payment columns and highlights new orders. */
export function OrdersTable({ orders, hrefBase, admin = false }: { orders: Order[]; hrefBase: string; admin?: boolean }) {
  if (!orders.length) return <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No orders yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Order</th>
            <th scope="col" className="px-4 py-3 font-semibold">Date</th>
            {admin && <th scope="col" className="px-4 py-3 font-semibold">Customer</th>}
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            {admin && <th scope="col" className="px-4 py-3 font-semibold">Payment</th>}
            <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const isNew = admin && o.status === "awaiting_confirmation";
            return (
              <tr key={o.id} className={`border-t ${isNew ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}>
                <td className="px-4 py-3">
                  <Link href={`${hrefBase}/${o.id}`} className="font-medium text-primary hover:underline">
                    {o.order_number}
                  </Link>
                  {isNew && <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">New</span>}
                  {admin && (
                    <span className="block text-xs text-muted-foreground">
                      {countryName(o.shipping_address?.country)}
                      {o.contains_live_animals && " · Live animal"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(o.created_at)}</td>
                {admin && (
                  <td className="px-4 py-3">
                    {o.customer_name ?? "—"}
                    <span className="block text-xs text-muted-foreground">{o.email}</span>
                  </td>
                )}
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                {admin && <td className="px-4 py-3">{paymentMethodsLabel(o.payment_methods, o.payment_other)}</td>}
                <td className="px-4 py-3 text-right">{formatMoney(o.total_cents, o.currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
