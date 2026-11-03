import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { OrderDetail } from "@/components/account/order-detail";
import { OrderActions } from "@/components/admin/order-actions";
import { paymentMethodName, paymentMethods, paymentMethodsLabel } from "@/config/payments";
import { requireAdmin } from "@/lib/admin";
import { getOrder } from "@/lib/db/orders";
import { formatDate } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/orders";

export const metadata = { title: "Order" };

const digits = (phone: string) => phone.replace(/\D/g, "");
const dateTime = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { q } = await requireAdmin();
  const order = await getOrder(q, id);
  if (!order) notFound();
  const chosen = order.payment_methods ?? [];
  const methods = paymentMethods.map((m) => ({ id: m.id, name: m.id === "other" && order.payment_other ? `Other: ${order.payment_other}` : paymentMethodName(m.id), chosen: chosen.includes(m.id) }));
  const defaultMethod = order.confirmed_payment_method ?? chosen[0] ?? paymentMethods[0].id;
  const defaultShipping = order.shipping_confirmed ? (order.shipping_cents / 100).toFixed(2) : "";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
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
            Customer &amp; payment
          </h2>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium">Name</dt>
              <dd>
                {order.customer_name ?? "—"}
                {order.company && <span className="text-muted-foreground"> · {order.company}</span>}
              </dd>
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
                <dd className="flex flex-wrap gap-x-3">
                  <a href={`tel:+${digits(order.phone)}`} className="text-primary underline">
                    {order.phone}
                  </a>
                  <a href={`https://wa.me/${digits(order.phone)}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    WhatsApp
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
              <dt className="font-medium">Would like to pay by</dt>
              <dd>{paymentMethodsLabel(order.payment_methods, order.payment_other)}</dd>
            </div>
            {order.confirmed_payment_method && (
              <div>
                <dt className="font-medium">Payment details sent for</dt>
                <dd>
                  {paymentMethodName(order.confirmed_payment_method)}
                  {order.payment_reference && ` · ref ${order.payment_reference}`}
                </dd>
              </div>
            )}
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
            {order.contains_live_animals && (
              <div>
                <dt className="font-medium">Live animals</dt>
                <dd>
                  {order.preferred_delivery_date && <>Preferred delivery {formatDate(`${order.preferred_delivery_date}T12:00:00Z`)}. </>}
                  {order.live_animal_ack_at && <>18+ and Live Animal Policy confirmed {dateTime(order.live_animal_ack_at)}.</>}
                </dd>
              </div>
            )}
          </dl>
          {order.delivery_notes && (
            <div className="sm:col-span-2">
              <p className="font-medium">Order notes</p>
              <p className="whitespace-pre-line">{order.delivery_notes}</p>
            </div>
          )}
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
                  {e.status && <> · {STATUS_LABELS[e.status] ?? e.status}</>}
                </p>
                <p>{e.message}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <aside className="h-fit space-y-3 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Next steps</h2>
        <OrderActions
          id={order.id}
          status={order.status}
          methods={methods}
          defaultMethod={defaultMethod}
          defaultShipping={defaultShipping}
          carrier={order.carrier}
          tracking={order.tracking_number}
        />
      </aside>
    </div>
  );
}
