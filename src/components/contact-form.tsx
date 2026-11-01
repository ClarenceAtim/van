"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/app/actions/public";
import { Field } from "@/components/form-field";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactMessage, null);
  if (state?.ok) {
    return (
      <p role="status" className="rounded-2xl bg-sand/60 p-6 text-lg">
        {state.message}
      </p>
    );
  }
  const err = state?.errors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.message && !state.ok && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" error={err.name}>
          <Input name="name" autoComplete="name" required maxLength={100} />
        </Field>
        <Field label="Email" name="email" error={err.email}>
          <Input name="email" type="email" autoComplete="email" required maxLength={254} />
        </Field>
      </div>
      <Field label="Subject" name="subject" error={err.subject}>
        <Input name="subject" required maxLength={150} />
      </Field>
      <Field label="Message" name="message" error={err.message}>
        <Textarea name="message" required rows={7} maxLength={5000} />
      </Field>
      {/* Honeypot for simple bots */}
      <div aria-hidden className="hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Turnstile />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
