"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { draftConfirmation, orderAction } from "@/app/actions/admin";
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

/** Pick a method and shipping cost, fill in the template, edit it, send. */
function ConfirmationForm({ id, methods, defaultMethod, defaultShipping }: { id: string; methods: { id: string; name: string; chosen: boolean }[]; defaultMethod: string; defaultShipping: string }) {
  const [methodId, setMethodId] = useState(defaultMethod);
  const [shipping, setShipping] = useState(defaultShipping);
  const [draft, setDraft] = useState<{ subject: string; body: string; detailsMissing: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filling, startFilling] = useTransition();

  const fill = () =>
    startFilling(async () => {
      setError(null);
      const res = await draftConfirmation({ id, methodId, shipping });
      if (!res.ok) setError(res.message);
      else setDraft({ subject: res.subject, body: res.body, detailsMissing: res.detailsMissing });
    });

  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Shipping cost</span>
        <Input value={shipping} onChange={(e) => { setShipping(e.target.value); setDraft(null); }} inputMode="decimal" placeholder="e.g. 14.95 (0 = free)" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Send payment details for</span>
        <select value={methodId} onChange={(e) => { setMethodId(e.target.value); setDraft(null); }} className={`${fieldClass} h-10`}>
          <optgroup label="Chosen by the customer">
            {methods.filter((m) => m.chosen).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Other methods">
            {methods.filter((m) => !m.chosen).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {!draft ? (
        <Button type="button" className="w-full" onClick={fill} disabled={filling || !shipping.trim()}>
          {filling ? "Filling in…" : "Fill in confirmation email"}
        </Button>
      ) : (
        <ActionForm id={id} action="send-confirmation" submit="Send confirmation to customer" confirm="Send this confirmation email to the customer?">
          <input type="hidden" name="method_id" value={methodId} />
          <input type="hidden" name="shipping" value={shipping} />
          {draft.detailsMissing && (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-950">
              Your details for this method aren&apos;t saved yet. Replace the [bracketed] line below, or save them once in{" "}
              <a href="/admin/settings/payment-templates" target="_blank" className="underline">
                Settings → Payment templates
              </a>
              .
            </p>
          )}
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Subject</span>
            <Input name="subject" defaultValue={draft.subject} required />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Message (edit anything before sending)</span>
            <textarea name="body" defaultValue={draft.body} rows={18} className={`${fieldClass} font-mono text-xs`} required />
          </label>
        </ActionForm>
      )}
    </div>
  );
}

export function OrderActions({
  id,
  status,
  methods,
  defaultMethod,
  defaultShipping,
  carrier,
  tracking,
}: {
  id: string;
  status: OrderStatus;
  methods: { id: string; name: string; chosen: boolean }[];
  defaultMethod: string;
  defaultShipping: string;
  carrier: string | null;
  tracking: string | null;
}) {
  const unpaid = status === "awaiting_confirmation" || status === "confirmation_sent";
  const canShip = status === "paid" || status === "processing" || status === "shipped";
  const canCancel = unpaid || status === "paid" || status === "processing";
  return (
    <div className="space-y-3">
      {unpaid && (
        <Panel title={status === "confirmation_sent" ? "Resend order confirmation" : "1. Send order confirmation"} open={status === "awaiting_confirmation"}>
          <ConfirmationForm id={id} methods={methods} defaultMethod={defaultMethod} defaultShipping={defaultShipping} />
        </Panel>
      )}
      {unpaid && (
        <Panel title="2. Mark as paid" open={status === "confirmation_sent"}>
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
              <Input name="carrier" defaultValue={carrier ?? ""} placeholder="UPS, FedEx, USPS, DHL…" />
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
          <p className="mb-3 text-xs text-muted-foreground">Record a refund you&apos;ve already sent the customer. No email is sent.</p>
          <ActionForm id={id} action="set-status" submit="Mark as refunded" variant="outline" confirm="Mark this order as refunded?">
            <input type="hidden" name="status" value="refunded" />
          </ActionForm>
        </Panel>
      )}
    </div>
  );
}
