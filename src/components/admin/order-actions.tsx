"use client";

import { useActionState, type ReactNode } from "react";
import { orderAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrderStatus } from "@/lib/orders";

const fieldClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

/** One form per admin action; each posts to the same server action with its own `action` value. */
function ActionForm({ id, action, children, submit, variant, confirm }: { id: string; action: string; children?: ReactNode; submit: string; variant?: "outline" | "destructive"; confirm?: string }) {
  const [state, formAction, pending] = useActionState(orderAction, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      {children}
      {state?.message && (
        <p role={state.ok ? "status" : "alert"} className={`rounded-lg p-2 text-sm ${state.ok ? "bg-sand/60" : "bg-destructive/10 text-destructive"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" variant={variant} className="w-full" disabled={pending}>
        {pending ? "Working…" : submit}
      </Button>
    </form>
  );
}

function Panel({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-xl border p-4 [&_summary]:cursor-pointer">
      <summary className="font-semibold">{title}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function OrderActions({
  id,
  status,
  draft,
  carrier,
  tracking,
}: {
  id: string;
  status: OrderStatus;
  draft: { subject: string; body: string; isDefault: boolean };
  carrier: string | null;
  tracking: string | null;
}) {
  const unpaid = status === "awaiting_payment_details" || status === "payment_details_sent";
  const canShip = status === "paid" || status === "processing" || status === "shipped";
  const canCancel = unpaid || status === "paid" || status === "processing";
  return (
    <div className="space-y-3">
      {unpaid && (
        <Panel title={status === "payment_details_sent" ? "Resend payment details" : "1. Send payment details"} open={status === "awaiting_payment_details"}>
          {draft.isDefault && (
            <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-950">
              This is the default template without your payment details. Set them once in{" "}
              <a href="/admin/settings/payment-templates" className="underline">
                Settings → Payment templates
              </a>
              , or edit the text below.
            </p>
          )}
          <ActionForm id={id} action="send-payment-details" submit="Send email to customer">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Subject</span>
              <Input name="subject" defaultValue={draft.subject} required />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Message</span>
              <textarea name="body" defaultValue={draft.body} rows={14} className={`${fieldClass} font-mono text-xs`} required />
            </label>
          </ActionForm>
        </Panel>
      )}
      {unpaid && (
        <Panel title="2. Mark as paid" open={status === "payment_details_sent"}>
          <ActionForm id={id} action="mark-paid" submit="Mark as paid" confirm="Mark this order as paid and email the customer?">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Payment reference or note (optional)</span>
              <Input name="reference" placeholder="e.g. Zelle confirmation 8F2K…" />
            </label>
          </ActionForm>
        </Panel>
      )}
      {status === "paid" && (
        <Panel title="Mark as processing (packing)">
          <ActionForm id={id} action="set-status" submit="Mark as processing">
            <input type="hidden" name="status" value="processing" />
          </ActionForm>
        </Panel>
      )}
      {canShip && (
        <Panel title={status === "shipped" ? "Update tracking number" : "3. Add tracking number"} open={status === "paid" || status === "processing"}>
          <ActionForm id={id} action="add-tracking" submit="Save and email customer">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Carrier</span>
              <Input name="carrier" defaultValue={carrier ?? ""} placeholder="UPS, FedEx, USPS…" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Tracking number</span>
              <Input name="tracking_number" defaultValue={tracking ?? ""} required />
            </label>
          </ActionForm>
        </Panel>
      )}
      {status === "shipped" && (
        <Panel title="Mark as delivered">
          <ActionForm id={id} action="set-status" submit="Mark as delivered">
            <input type="hidden" name="status" value="delivered" />
          </ActionForm>
        </Panel>
      )}
      {canCancel && (
        <Panel title="Cancel order">
          <ActionForm id={id} action="cancel" submit="Cancel order" variant="destructive" confirm="Cancel this order, release the stock and email the customer?">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Reason (sent to the customer)</span>
              <textarea name="reason" rows={3} className={fieldClass} defaultValue={unpaid ? "We didn't receive payment for this order." : ""} required />
            </label>
          </ActionForm>
        </Panel>
      )}
      {!unpaid && status !== "refunded" && (
        <Panel title="Mark as refunded">
          <p className="mb-3 text-xs text-muted-foreground">Record a refund you've already sent the customer. No email is sent.</p>
          <ActionForm id={id} action="set-status" submit="Mark as refunded" variant="outline" confirm="Mark this order as refunded?">
            <input type="hidden" name="status" value="refunded" />
          </ActionForm>
        </Panel>
      )}
    </div>
  );
}
