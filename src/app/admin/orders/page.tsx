import Link from "next/link";
import { OrdersTable } from "@/components/account/orders-table";
import { requireAdmin } from "@/lib/admin";
import { ORDER_STATUSES, type Order } from "@/lib/orders";

export const metadata = { title: "Orders" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase } = await requireAdmin();
  const { status } = await searchParams;
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  else query = query.neq("status", "pending");
  const { data } = await query;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Orders</h1>
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2 text-sm">
        {["", ...ORDER_STATUSES].map((s) => (
          <Link key={s || "all"} href={s ? `/admin/orders?status=${s}` : "/admin/orders"} aria-current={(status ?? "") === s ? "page" : undefined} className={`rounded-full border px-3 py-1 capitalize ${(status ?? "") === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {s || "All (excl. unpaid)"}
          </Link>
        ))}
      </nav>
      <OrdersTable orders={(data ?? []) as Order[]} hrefBase="/admin/orders" />
    </div>
  );
}
