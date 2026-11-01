import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { OrderDetail } from "@/components/account/order-detail";
import { OrderUpdateForm } from "@/components/admin/order-update-form";
import { requireAdmin } from "@/lib/admin";
import type { Order } from "@/lib/orders";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const order = data as Order;
  const a = order.shipping_address;
  const regionMismatch = order.contains_live_animals && a?.state && a.declared_region && a.state !== a.declared_region;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {regionMismatch && (
          <p role="alert" className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            Live animal order: customer declared {a!.declared_region} at checkout but the shipping address is in {a!.state}. Check that you can legally ship there before
            packing.
          </p>
        )}
        {order.contains_live_animals && order.live_animal_ack_at && (
          <p className="text-sm text-muted-foreground">Customer confirmed 18+ and the Live Animal Policy on {new Date(order.live_animal_ack_at).toLocaleString()}.</p>
        )}
        <OrderDetail order={order} />
      </div>
      <aside className="h-fit rounded-2xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">Update order</h2>
        <OrderUpdateForm id={order.id} status={order.status} carrier={order.carrier} tracking={order.tracking_number} />
      </aside>
    </div>
  );
}
