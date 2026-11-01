"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { sendMagicLink, signIn } from "@/app/actions/auth";
import { Field } from "@/components/form-field";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/validation";

function Message({ state }: { state: FormState }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${state.ok ? "bg-sand/60" : "bg-destructive/10 text-destructive"}`}>
      {state.message}
    </p>
  );
}

export function LoginForms({ next, linkError }: { next: string; linkError: boolean }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pwState, pwAction, pwPending] = useActionState(signIn, linkError ? { ok: false, message: "That sign-in link is invalid or has expired. Please request a new one." } : null);
  const [mlState, mlAction, mlPending] = useActionState(sendMagicLink, null);

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
        {(["password", "magic"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-md py-2 ${mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {m === "password" ? "Password" : "Email me a link"}
          </button>
        ))}
      </div>

      {mode === "password" ? (
        <form action={pwAction} className="space-y-4" noValidate>
          <Message state={pwState} />
          <input type="hidden" name="next" value={next} />
          <Field label="Email" name="email" error={pwState?.errors?.email}>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" name="password" error={pwState?.errors?.password}>
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Turnstile />
          <Button type="submit" size="lg" className="w-full" disabled={pwPending}>
            {pwPending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Forgot your password? Use <button type="button" className="font-medium text-primary underline" onClick={() => setMode("magic")}>email me a link</button>.
          </p>
        </form>
      ) : (
        <form action={mlAction} className="space-y-4" noValidate>
          <Message state={mlState} />
          <input type="hidden" name="next" value={next} />
          <Field label="Email" name="email" error={mlState?.errors?.email} hint="We'll email you a one-time sign-in link. No password needed.">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Turnstile />
          <Button type="submit" size="lg" className="w-full" disabled={mlPending}>
            {mlPending ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
