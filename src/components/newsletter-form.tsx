"use client";

import { useId, useState } from "react";
import { subscribeNewsletter, type PublicFormResult } from "@/app/actions/public";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postToFormSubmit } from "@/lib/formsubmit-client";

export function NewsletterForm() {
  const [state, setState] = useState<PublicFormResult | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const id = useId();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState(null);
    const form = new FormData(e.currentTarget);
    if (token) form.set("turnstileToken", token);
    setPending(true);
    try {
      const res = await subscribeNewsletter(form);
      if (!res.ok) {
        setState(res);
        return;
      }
      if (res.emailEndpoint && res.emailFields) {
        // Database down: the signup goes to the store inbox from this browser.
        const emailed = await postToFormSubmit(res.emailEndpoint, res.emailFields);
        if (!emailed) {
          setState({ ok: false, message: "Something went wrong. Please try again." });
          return;
        }
      }
      setState(res);
    } catch {
      setState({ ok: false, message: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  if (state?.ok) return <p className="text-sm font-medium text-primary" role="status">{state.message}</p>;
  return (
    <form onSubmit={submit} className="space-y-2" noValidate>
      <div className="flex gap-2">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="max-w-64" aria-invalid={!!state?.errors?.email} aria-describedby={`${id}-msg`} />
        <Button type="submit" disabled={pending}>
          Subscribe
        </Button>
      </div>
      <Turnstile onToken={setToken} />
      <p id={`${id}-msg`} className="text-sm text-destructive" role="alert">
        {state?.errors?.email?.[0] ?? (state && !state.ok ? state.message : "")}
      </p>
    </form>
  );
}
