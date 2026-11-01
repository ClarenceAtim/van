"use client";

import { useActionState } from "react";
import { saveProfile } from "@/app/actions/account";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action, pending] = useActionState(saveProfile, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && (
        <p role={state.ok ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${state.ok ? "bg-sand/60" : "bg-destructive/10 text-destructive"}`}>
          {state.message}
        </p>
      )}
      <Field label="Full name" name="full_name" error={state?.errors?.full_name}>
        <Input name="full_name" defaultValue={fullName} autoComplete="name" required />
      </Field>
      <Field label="Phone" name="phone" error={state?.errors?.phone}>
        <Input name="phone" type="tel" defaultValue={phone} autoComplete="tel" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
