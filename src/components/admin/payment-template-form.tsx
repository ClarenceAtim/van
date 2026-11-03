"use client";

import { useActionState } from "react";
import { savePaymentTemplate } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TemplateField } from "@/config/payments";

export function PaymentTemplateForm({
  methodId,
  fields,
  details,
  subject,
  body,
}: {
  methodId: string;
  fields: TemplateField[];
  details: Record<string, string>;
  subject: string;
  body: string;
}) {
  const [state, action, pending] = useActionState(savePaymentTemplate, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="method_id" value={methodId} />
      <fieldset className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
        <legend className="mb-1 px-1 text-sm font-semibold">Your payment details</legend>
        {fields.map((f) => (
          <label key={f.key} className="block space-y-1 text-sm">
            <span className="font-medium">{f.label}</span>
            <Input name={`detail_${f.key}`} defaultValue={details[f.key] ?? ""} placeholder={f.placeholder} autoComplete="off" />
          </label>
        ))}
      </fieldset>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Email subject</span>
        <Input name="subject" defaultValue={subject} required />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Email text</span>
        <textarea name="body" defaultValue={body} rows={16} required className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs" />
      </label>
      {state?.message && (
        <p role={state.ok ? "status" : "alert"} className={`rounded-lg p-2 text-sm ${state.ok ? "bg-sand/60" : "bg-destructive/10 text-destructive"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save template"}
      </Button>
    </form>
  );
}
