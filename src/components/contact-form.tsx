"use client";

import { useState } from "react";
import { prepareContactMessage, type PublicFormResult } from "@/app/actions/public";
import { Field } from "@/components/form-field";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/config/site";
import { postToFormSubmit } from "@/lib/formsubmit-client";

export function ContactForm() {
  const [state, setState] = useState<PublicFormResult | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState(null);
    const form = new FormData(e.currentTarget);
    if (token) form.set("turnstileToken", token);
    setPending(true);
    try {
      const res = await prepareContactMessage(form);
      if (!res.ok) {
        setState(res);
        return;
      }
      if (res.emailEndpoint && res.emailFields) {
        // Database down: the message goes to the store inbox from this browser.
        const emailed = await postToFormSubmit(res.emailEndpoint, res.emailFields);
        if (!emailed) {
          setState({ ok: false, message: `We couldn't send your message. Please email ${siteConfig.contact.email} instead.` });
          return;
        }
      }
      setState(res);
      setSent(true);
    } catch {
      setState({ ok: false, message: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p role="status" className="rounded-2xl bg-sand/60 p-6 text-lg">
        {state?.message ?? "Thanks — we'll reply within one business day."}
      </p>
    );
  }
  const err = state?.errors ?? {};
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
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
      <Turnstile onToken={setToken} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
