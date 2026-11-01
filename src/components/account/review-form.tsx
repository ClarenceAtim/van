"use client";

import { useActionState } from "react";
import { submitReview } from "@/app/actions/account";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ReviewForm({ productSlug }: { productSlug: string }) {
  const [state, action, pending] = useActionState(submitReview, null);
  if (state?.ok) {
    return (
      <p role="status" className="rounded-xl bg-sand/60 p-5">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      )}
      <input type="hidden" name="productSlug" value={productSlug} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Rating</legend>
        <div className="flex gap-4">
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n} className="flex items-center gap-1 text-sm">
              <input type="radio" name="rating" value={n} defaultChecked={n === 5} className="size-4 accent-primary" /> {n}★
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Title" name="title" error={state?.errors?.title}>
        <Input name="title" required maxLength={120} />
      </Field>
      <Field label="Your review" name="body" error={state?.errors?.body}>
        <Textarea name="body" required rows={6} maxLength={4000} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
