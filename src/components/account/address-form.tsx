"use client";

import { useActionState } from "react";
import { saveAddress } from "@/app/actions/account";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { US_STATES } from "@/lib/validation";

export function AddressForm() {
  const [state, action, pending] = useActionState(saveAddress, null);
  const err = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate key={state?.ok ? Date.now() : "form"}>
      {state?.message && (
        <p role={state.ok ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${state.ok ? "bg-sand/60" : "bg-destructive/10 text-destructive"}`}>
          {state.message}
        </p>
      )}
      <Field label="Full name" name="full_name" error={err.full_name}>
        <Input name="full_name" autoComplete="name" required />
      </Field>
      <Field label="Street address" name="line1" error={err.line1}>
        <Input name="line1" autoComplete="address-line1" required />
      </Field>
      <Field label="Apartment, suite (optional)" name="line2" error={err.line2}>
        <Input name="line2" autoComplete="address-line2" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" name="city" error={err.city}>
          <Input name="city" autoComplete="address-level2" required />
        </Field>
        <Field label="State" name="region" error={err.region}>
          <select name="region" autoComplete="address-level1" required defaultValue="" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="" disabled>
              Choose…
            </option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ZIP code" name="postal_code" error={err.postal_code}>
          <Input name="postal_code" autoComplete="postal-code" inputMode="numeric" required />
        </Field>
      </div>
      <Field label="Phone (for the courier, optional)" name="phone" error={err.phone}>
        <Input name="phone" type="tel" autoComplete="tel" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_default" className="size-4 accent-primary" /> Make this my default address
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save address"}
      </Button>
    </form>
  );
}
