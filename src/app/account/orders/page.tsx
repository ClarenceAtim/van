import { OrdersTable } from "@/components/account/orders-table";
import { requireProfile } from "@/lib/auth/server";
import { listOrdersForUser } from "@/lib/db/orders";
import { db } from "@/lib/db/pool";

export const metadata = { title: "Order history" };

export default async function OrdersPage() {
  const profile = await requireProfile("/account/orders");
  // Scoped to the signed-in user in SQL (user_id = session user).
  const data = await listOrdersForUser(db(), profile.id);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Order history</h1>
      <OrdersTable orders={data} hrefBase="/account/orders" />
    </div>
  );
}
