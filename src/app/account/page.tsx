import Link from "next/link";
import { OrdersTable } from "@/components/account/orders-table";
import { requireProfile } from "@/lib/auth/server";
import { listOrdersForUser } from "@/lib/db/orders";
import { db } from "@/lib/db/pool";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const profile = await requireProfile();
  const data = await listOrdersForUser(db(), profile.id, 5);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Hi{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!</h1>
      <section aria-labelledby="recent-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-heading" className="text-xl font-semibold">
            Recent orders
          </h2>
          <Link href="/account/orders" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <OrdersTable orders={data} hrefBase="/account/orders" />
      </section>
    </div>
  );
}
