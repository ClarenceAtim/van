"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Lock } from "lucide-react";
import { startCheckout } from "@/app/actions/checkout";
import { Field } from "@/components/form-field";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { US_STATES } from "@/lib/validation";

export function CheckoutForm({ containsLiveAnimals, signedInEmail }: { containsLiveAnimals: boolean; signedInEmail: string | null }) {
  const [state, action, pending] = useActionState(startCheckout, null);
  const err = state?.errors ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      {state?.message && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      )}

      {signedInEmail ? (
        <p className="text-sm text-muted-foreground">
          Order confirmation will be sent to <strong className="text-foreground">{signedInEmail}</strong>.
        </p>
      ) : (
        <div className="space-y-2">
          <Field label="Email for your order confirmation" name="email" error={err.email}>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <p className="text-sm text-muted-foreground">
            Checking out as a guest.{" "}
            <Link href="/login?next=/checkout" className="font-medium text-primary underline">
              Sign in
            </Link>{" "}
            to save this order to your account.
          </p>
        </div>
      )}

      <Field label="Shipping state" name="shippingRegion" error={err.shippingRegion} hint={containsLiveAnimals ? "Live animals can only ship to states where we're allowed to deliver them." : undefined}>
        <select name="shippingRegion" required defaultValue="" autoComplete="address-level1" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
          <option value="" disabled>
            Choose your state…
          </option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      {containsLiveAnimals && (
        <fieldset className="space-y-3 rounded-xl border border-sand-strong bg-sand/50 p-4">
          <legend className="px-1 font-semibold">Live animal policy</legend>
          <p className="text-sm">
            Live animals ship overnight {siteConfig.shipping.liveAnimalShipDays}, only when the weather along the route is safe. Shipping depends on your local laws,
            and an adult must be available to receive the package.
          </p>
          <label className="flex items-start gap-3 text-sm font-medium">
            <input type="checkbox" name="liveAnimalAck" required className="mt-0.5 size-5 shrink-0 accent-primary" aria-invalid={!!err.liveAnimalAck} />
            <span>
              I am {siteConfig.liveAnimals.minimumAge}+ and agree to the{" "}
              <Link href="/terms#live-animals" target="_blank" className="text-primary underline">
                Live Animal Policy
              </Link>
              , and I confirm this species is legal to keep where I live.
            </span>
          </label>
          {err.liveAnimalAck && <p className="text-sm text-destructive">{err.liveAnimalAck[0]}</p>}
        </fieldset>
      )}

      <Turnstile />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <Lock /> {pending ? "Redirecting to secure payment…" : "Continue to secure payment"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">You&apos;ll enter your shipping address and payment details on Stripe&apos;s secure checkout page.</p>
    </form>
  );
}
