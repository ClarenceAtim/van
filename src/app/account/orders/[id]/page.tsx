import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/account/order-detail";
import type { Order } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Order details" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  // RLS: returns nothing if this order belongs to someone else.
  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <OrderDetail order={data as Order} reviewLinks />;
}
