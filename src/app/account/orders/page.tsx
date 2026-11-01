import { OrdersTable } from "@/components/account/orders-table";
import type { Order } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Order history" };

export default async function OrdersPage() {
  const supabase = await createClient();
  // RLS limits this to the signed-in user's orders.
  const { data } = await supabase.from("orders").select("*").neq("status", "pending").order("created_at", { ascending: false });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Order history</h1>
      <OrdersTable orders={(data ?? []) as Order[]} hrefBase="/account/orders" />
    </div>
  );
}
