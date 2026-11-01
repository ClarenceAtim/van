"use client";

import { useActionState } from "react";
import { updateOrder } from "@/app/actions/admin";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ORDER_STATUSES } from "@/lib/orders";

export function OrderUpdateForm({ id, status, carrier, tracking }: { id: string; status: string; carrier: string | null; tracking: string | null }) {
  const [state, action, pending] = useActionState(updateOrder, null);
  return (
    <form action={action} className="space-y-4">
      {state?.message && (
        <p role={state.ok ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${state.ok ? "bg-sand/60" : "bg-destructive/10 text-destructive"}`}>
          {state.message}
        </p>
      )}
      <input type="hidden" name="id" value={id} />
      <Field label="Status" name="status">
        <select name="status" defaultValue={status} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm capitalize">
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Carrier" name="carrier">
        <Input name="carrier" defaultValue={carrier ?? ""} placeholder="UPS, FedEx, USPS…" />
      </Field>
      <Field label="Tracking number" name="tracking_number" hint="Adding or changing it emails the customer.">
        <Input name="tracking_number" defaultValue={tracking ?? ""} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
