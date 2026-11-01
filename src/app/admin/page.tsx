import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { OrdersTable } from "@/components/account/orders-table";
import { configWarnings, requireAdmin } from "@/lib/admin";
import { formatMoney } from "@/lib/format";
import type { Order } from "@/lib/orders";

export const metadata = { title: "Overview" };

const LOW_STOCK = 3;

export default async function AdminOverview() {
  const { supabase } = await requireAdmin();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [paid, recent, lowStock, pendingReviews, unread] = await Promise.all([
    supabase.from("orders").select("total_cents, created_at").in("status", ["paid", "processing", "shipped", "delivered"]).gte("created_at", since),
    supabase.from("orders").select("*").neq("status", "pending").order("created_at", { ascending: false }).limit(8),
    supabase.from("products").select("id, name, stock_quantity").eq("active", true).lte("stock_quantity", LOW_STOCK).order("stock_quantity"),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false),
  ]);
  const revenue = (paid.data ?? []).reduce((s, o) => s + o.total_cents, 0);
  const toShip = (recent.data ?? []).filter((o) => o.status === "paid" || o.status === "processing").length;
  const stats = [
    { label: "Sales (30 days)", value: formatMoney(revenue) },
    { label: "Orders (30 days)", value: String(paid.data?.length ?? 0) },
    { label: "Awaiting shipment", value: String(toShip), href: "/admin/orders?status=paid" },
    { label: "Reviews to moderate", value: String(pendingReviews.count ?? 0), href: "/admin/reviews" },
    { label: "Unread messages", value: String(unread.count ?? 0), href: "/admin/messages" },
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
          <OrdersTable orders={(recent.data ?? []) as Order[]} hrefBase="/admin/orders" />
        </section>
        <section aria-labelledby="low-stock" className="space-y-3">
          <h2 id="low-stock" className="text-xl font-semibold">Low stock (≤ {LOW_STOCK})</h2>
          {lowStock.data?.length ? (
            <ul className="divide-y rounded-xl border text-sm">
              {lowStock.data.map((p) => (
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
