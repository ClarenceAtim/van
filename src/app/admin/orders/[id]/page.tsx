import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { OrderDetail } from "@/components/account/order-detail";
import { OrderActions } from "@/components/admin/order-actions";
import { paymentMethodName } from "@/config/payments";
import { requireAdmin } from "@/lib/admin";
import { getOrder } from "@/lib/db/orders";
import { formatDate } from "@/lib/format";
import { paymentEmailDraft } from "@/lib/order-service";
import { deliveryLabel, STATUS_LABELS } from "@/lib/orders";

export const metadata = { title: "Order" };

const digits = (phone: string) => phone.replace(/\D/g, "");
const dateTime = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { q } = await requireAdmin();
  const order = await getOrder(q, id);
  if (!order) notFound();
  const draft = await paymentEmailDraft(q, order);
  const a = order.shipping_address;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/orders" className="text-sm text-primary underline">
            ← All orders
          </Link>
          <Link href={`/admin/orders/${order.id}/packing-slip`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
            <Printer className="size-4" aria-hidden /> Print packing slip
          </Link>
        </div>
        <OrderDetail order={order} />

        <section aria-labelledby="customer-heading" className="grid gap-4 rounded-xl border p-4 text-sm sm:grid-cols-2">
          <h2 id="customer-heading" className="text-lg font-semibold sm:col-span-2">
            Customer &amp; delivery
          </h2>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium">Name</dt>
              <dd>{order.customer_name ?? a?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium">Email</dt>
              <dd>
                <a href={`mailto:${order.email}?subject=${encodeURIComponent(`Order ${order.order_number}`)}`} className="text-primary underline">
                  {order.email}
                </a>
              </dd>
            </div>
            {order.phone && (
              <div>
                <dt className="font-medium">Phone</dt>
                <dd>
                  <a href={`tel:+${digits(order.phone)}`} className="text-primary underline">
                    {order.phone}
                  </a>
                </dd>
              </div>
            )}
            {order.whatsapp && (
              <div>
                <dt className="font-medium">WhatsApp</dt>
                <dd>
                  <a href={`https://wa.me/${digits(order.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    {order.whatsapp}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="font-medium">Account</dt>
              <dd>{order.user_id ? "Signed-in customer" : "Guest checkout"}</dd>
            </div>
          </dl>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium">Delivery</dt>
              <dd>
                {deliveryLabel(order)}
                {order.preferred_delivery_date && ` · preferred ${formatDate(`${order.preferred_delivery_date}T12:00:00Z`)}`}
              </dd>
            </div>
            {order.delivery_notes && (
              <div>
                <dt className="font-medium">Delivery notes</dt>
                <dd className="whitespace-pre-line">{order.delivery_notes}</dd>
              </div>
            )}
            <div>
              <dt className="font-medium">Payment method</dt>
              <dd>
                {paymentMethodName(order.payment_method)}
                {order.payment_reference && ` · ref ${order.payment_reference}`}
              </dd>
            </div>
            {order.payment_due_at && !order.paid_at && (
              <div>
                <dt className="font-medium">Payment due</dt>
                <dd>{dateTime(order.payment_due_at)} (released automatically after this)</dd>
              </div>
            )}
            {order.paid_at && (
              <div>
                <dt className="font-medium">Paid</dt>
                <dd>{dateTime(order.paid_at)}</dd>
              </div>
            )}
            {order.contains_live_animals && order.live_animal_ack_at && (
              <div>
                <dt className="font-medium">Live animals</dt>
                <dd>18+ and Live Animal Policy confirmed {dateTime(order.live_animal_ack_at)}</dd>
              </div>
            )}
          </dl>
        </section>

        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-3 text-lg font-semibold">
            History
          </h2>
          <ol className="space-y-3 border-l pl-4 text-sm">
            {[...(order.order_events ?? [])].reverse().map((e) => (
              <li key={e.id}>
                <p className="text-xs text-muted-foreground">
                  {dateTime(e.created_at)}
                  {e.status && <> · {STATUS_LABELS[e.status]}</>}
                </p>
                <p>{e.message}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <aside className="h-fit space-y-3 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Next steps</h2>
        <OrderActions id={order.id} status={order.status} draft={draft} carrier={order.carrier} tracking={order.tracking_number} />
      </aside>
    </div>
  );
}
