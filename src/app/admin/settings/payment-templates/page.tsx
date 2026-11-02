import Link from "next/link";
import { PaymentTemplateForm } from "@/components/admin/payment-template-form";
import { paymentMethods } from "@/config/payments";
import { requireAdmin } from "@/lib/admin";
import { listPaymentTemplates } from "@/lib/db/orders";
import { defaultTemplate } from "@/lib/order-service";

export const metadata = { title: "Payment templates" };

const VARIABLES = ["{{customer_name}}", "{{order_number}}", "{{amount}}", "{{payment_method}}", "{{due_date}}", "{{store_name}}"];

export default async function PaymentTemplatesPage() {
  const { q } = await requireAdmin();
  const saved = new Map((await listPaymentTemplates(q)).map((t) => [t.method_id, t]));

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <Link href="/admin/settings" className="text-sm text-primary underline">
          ← Settings
        </Link>
        <h1 className="text-3xl font-semibold">Payment templates</h1>
        <p className="text-sm text-muted-foreground">
          One email per payment method. When you click &quot;Send payment details&quot; on an order, the template for the customer&apos;s method is filled in and you can edit it
          before sending. Payment details are only ever sent by email; they are never shown on the website.
        </p>
        <p className="text-sm">
          Variables you can use: {VARIABLES.map((v) => <code key={v} className="mr-1.5 rounded bg-muted px-1 py-0.5 text-xs">{v}</code>)}
        </p>
      </div>
      {paymentMethods.map((m) => {
        const t = saved.get(m.id);
        const initial = t ?? defaultTemplate(m.id);
        return (
          <section key={m.id} aria-labelledby={`tpl-${m.id}`} className="space-y-3 rounded-2xl border p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`tpl-${m.id}`} className="text-xl font-semibold">
                {m.name}
              </h2>
              <span className={`text-xs ${t ? "text-primary" : "text-amber-700"}`}>
                {t ? `Saved${t.updated_at ? ` ${new Date(t.updated_at).toLocaleDateString("en-US", { dateStyle: "medium" })}` : ""}` : "Not set up yet: add your details"}
                {!m.enabled && " · hidden at checkout"}
              </span>
            </div>
            <PaymentTemplateForm methodId={m.id} subject={initial.subject} body={initial.body} />
          </section>
        );
      })}
    </div>
  );
}
