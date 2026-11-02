import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { OrdersTable } from "@/components/account/orders-table";
import { configWarnings, requireAdmin } from "@/lib/admin";
import { overview } from "@/lib/db/admin";
import { listOrders } from "@/lib/db/orders";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Overview" };

const LOW_STOCK = 3;

export default async function AdminOverview() {
  const { q } = await requireAdmin();
  const [stats30, recent] = await Promise.all([overview(q, LOW_STOCK), listOrders(q, {}, 8)]);
  const lowStock = stats30.lowStock;
  const stats = [
    { label: "Sales (30 days)", value: formatMoney(stats30.revenue) },
    { label: "Orders (30 days)", value: String(stats30.orders) },
    { label: "New orders (send payment details)", value: String(stats30.new_orders), href: "/admin/orders?status=awaiting_payment_details" },
    { label: "Waiting for payment", value: String(stats30.awaiting_payment), href: "/admin/orders?status=payment_details_sent" },
    { label: "Paid, to ship", value: String(stats30.to_ship), href: "/admin/orders?status=paid" },
    { label: "Reviews to moderate", value: String(stats30.pending_reviews), href: "/admin/reviews" },
    { label: "Unread messages", value: String(stats30.unread), href: "/admin/messages" },
  ];
  const warnings = configWarnings();

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold">Overview</h1>
      {warnings.length > 0 && (
        <section aria-labelledby="config-heading" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <h2 id="config-heading" className="mb-2 flex items-center gap-2 font-sans font-semibold">
            <AlertTriangle className="size-4" aria-hidden /> Configuration
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border p-4">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{s.href ? <Link href={s.href} className="hover:underline">{s.value}</Link> : s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="recent-orders" className="space-y-3">
          <h2 id="recent-orders" className="text-xl font-semibold">Recent orders</h2>
          <OrdersTable orders={recent} hrefBase="/admin/orders" admin />
        </section>
        <section aria-labelledby="low-stock" className="space-y-3">
          <h2 id="low-stock" className="text-xl font-semibold">Low stock (≤ {LOW_STOCK})</h2>
          {lowStock.length ? (
            <ul className="divide-y rounded-xl border text-sm">
              {lowStock.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 px-4 py-2">
                  <Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link>
                  <span className={p.stock_quantity === 0 ? "font-semibold text-destructive" : "text-amber-700"}>{p.stock_quantity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Everything is well stocked.</p>
          )}
        </section>
      </div>
    </div>
  );
}
