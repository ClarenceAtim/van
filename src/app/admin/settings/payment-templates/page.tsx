import Link from "next/link";
import { PaymentTemplateForm } from "@/components/admin/payment-template-form";
import { paymentGroups, paymentMethods } from "@/config/payments";
import { requireAdmin } from "@/lib/admin";
import { listPaymentTemplates } from "@/lib/db/orders";
import { defaultTemplate, TEMPLATE_VARIABLES } from "@/lib/order-service";

export const metadata = { title: "Payment templates" };

export default async function PaymentTemplatesPage() {
  const { q } = await requireAdmin();
  const saved = new Map((await listPaymentTemplates(q)).map((t) => [t.method_id, t]));

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-3">
        <Link href="/admin/settings" className="text-sm text-primary underline">
          ← Settings
        </Link>
        <h1 className="text-3xl font-semibold">Payment templates</h1>
        <p className="text-sm text-muted-foreground">
          One template per payment method. Fill in your details once; when you click &quot;Send order confirmation&quot; on an order, the template for the method you pick is
          filled in with the order, the shipping cost and these details, and you can edit it before sending. Only admins can see this page. Nothing here is shown on the website.
        </p>
        <p className="text-sm">
          Placeholders:{" "}
          {TEMPLATE_VARIABLES.map((v) => (
            <code key={v} className="mr-1.5 inline-block rounded bg-muted px-1 py-0.5 text-xs">{`{{${v}}}`}</code>
          ))}
        </p>
        <p className="text-xs text-muted-foreground">
          <code>{"{{payment_details}}"}</code> becomes your details below as &quot;Label: value&quot; lines. <code>{"{{totals}}"}</code> lists subtotal, tax (if any), shipping and the
          total to pay.
        </p>
      </div>
      {paymentGroups.map((g) => (
        <div key={g.id} className="space-y-4">
          <h2 className="font-sans text-sm font-semibold tracking-wide text-muted-foreground uppercase">{g.label}</h2>
          {paymentMethods
            .filter((m) => m.group === g.id)
            .map((m) => {
              const t = saved.get(m.id);
              const initial = t ?? defaultTemplate(m.id);
              const hasDetails = !!t && Object.values(t.details).some((v) => v?.trim());
              return (
                <details key={m.id} className="rounded-2xl border p-5 [&_summary]:cursor-pointer" open={!hasDetails && m.id === "zelle"}>
                  <summary className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold">{m.name}</span>
                    <span className={`text-xs ${hasDetails ? "text-primary" : "text-amber-700"}`}>
                      {hasDetails ? "Details saved" : "Add your details"}
                      {!m.enabled && " · switched off at checkout"}
                    </span>
                  </summary>
                  <div className="mt-4">
                    <PaymentTemplateForm methodId={m.id} fields={m.fields} details={initial.details} subject={initial.subject} body={initial.body} />
                  </div>
                </details>
              );
            })}
        </div>
      ))}
    </div>
  );
}
