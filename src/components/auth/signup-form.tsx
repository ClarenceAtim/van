"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { Field } from "@/components/form-field";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, null);
  if (state?.ok) {
    return (
      <p role="status" className="rounded-2xl bg-sand/60 p-6">
        {state.message}
      </p>
    );
  }
  const err = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Field label="Full name" name="fullName" error={err.fullName}>
        <Input name="fullName" autoComplete="name" required maxLength={100} />
      </Field>
      <Field label="Email" name="email" error={err.email}>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" name="password" error={err.password} hint="At least 10 characters, including a letter and a number.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Turnstile />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
      <p className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
