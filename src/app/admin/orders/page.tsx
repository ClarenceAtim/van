import Link from "next/link";
import { OrdersTable } from "@/components/account/orders-table";
import { paymentMethods } from "@/config/payments";
import { requireAdmin } from "@/lib/admin";
import { listOrders } from "@/lib/db/orders";
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from "@/lib/orders";

export const metadata = { title: "Orders" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; payment?: string }> }) {
  const { q } = await requireAdmin();
  const sp = await searchParams;
  const status = sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status) ? (sp.status as OrderStatus) : null;
  const payment = sp.payment && paymentMethods.some((m) => m.id === sp.payment) ? sp.payment : null;
  const data = await listOrders(q, { status, paymentMethod: payment });
  const href = (s: string | null, p: string | null) => {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (p) params.set("payment", p);
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };
  const pill = (active: boolean) => `rounded-full border px-3 py-1 ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Orders</h1>
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2 text-sm">
        <Link href={href(null, payment)} aria-current={!status ? "page" : undefined} className={pill(!status)}>
          All statuses
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={href(s, payment)} aria-current={status === s ? "page" : undefined} className={pill(status === s)}>
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </nav>
      <nav aria-label="Filter by payment method" className="flex flex-wrap gap-2 text-sm">
        <Link href={href(status, null)} aria-current={!payment ? "page" : undefined} className={pill(!payment)}>
          All payment methods
        </Link>
        {paymentMethods.map((m) => (
          <Link key={m.id} href={href(status, m.id)} aria-current={payment === m.id ? "page" : undefined} className={pill(payment === m.id)}>
            {m.name}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">Highlighted orders are new: send the customer payment details.</p>
      <OrdersTable orders={data} hrefBase="/admin/orders" admin />
    </div>
  );
}
