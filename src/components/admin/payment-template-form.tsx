"use client";

import { useActionState } from "react";
import { savePaymentTemplate } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PaymentTemplateForm({ methodId, subject, body }: { methodId: string; subject: string; body: string }) {
  const [state, action, pending] = useActionState(savePaymentTemplate, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="method_id" value={methodId} />
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Subject</span>
        <Input name="subject" defaultValue={subject} required />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Email body</span>
        <textarea name="body" defaultValue={body} rows={14} required className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs" />
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
