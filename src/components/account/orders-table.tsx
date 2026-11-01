import Link from "next/link";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusBadge, type Order } from "@/lib/orders";

export function OrdersTable({ orders, hrefBase }: { orders: Order[]; hrefBase: string }) {
  if (!orders.length) return <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No orders yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Order</th>
            <th scope="col" className="px-4 py-3 font-semibold">Date</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="px-4 py-3">
                <Link href={`${hrefBase}/${o.id}`} className="font-medium text-primary hover:underline">
                  {o.order_number}
                </Link>
              </td>
              <td className="px-4 py-3">{formatDate(o.created_at)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={o.status} />
              </td>
              <td className="px-4 py-3 text-right">{formatMoney(o.total_cents, o.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
