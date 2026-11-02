import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/account/order-detail";
import { requireProfile } from "@/lib/auth/server";
import { getOrderForUser } from "@/lib/db/orders";
import { db } from "@/lib/db/pool";

export const metadata = { title: "Order details" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const profile = await requireProfile("/account/orders");
  // Returns nothing if this order belongs to someone else.
  const data = await getOrderForUser(db(), profile.id, id);
  if (!data) notFound();
  return <OrderDetail order={data} reviewLinks />;
}
