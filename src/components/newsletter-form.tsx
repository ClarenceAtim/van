"use client";

import { useActionState, useId } from "react";
import { subscribeNewsletter } from "@/app/actions/public";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  const id = useId();
  if (state?.ok) return <p className="text-sm font-medium text-primary" role="status">{state.message}</p>;
  return (
    <form action={action} className="space-y-2" noValidate>
      <div className="flex gap-2">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="max-w-64" aria-invalid={!!state?.errors?.email} aria-describedby={`${id}-msg`} />
        <Button type="submit" disabled={pending}>
          Subscribe
        </Button>
      </div>
      <Turnstile />
      <p id={`${id}-msg`} className="text-sm text-destructive" role="alert">
        {state?.errors?.email?.[0] ?? (state && !state.ok ? state.message : "")}
      </p>
    </form>
  );
}
