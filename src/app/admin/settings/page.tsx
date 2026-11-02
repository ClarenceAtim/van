import Link from "next/link";
import { countryName, regionName } from "@/config/countries";
import { siteConfig } from "@/config/site";
import { configWarnings, requireAdmin } from "@/lib/admin";

export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  await requireAdmin();
  const warnings = configWarnings();
  const live = siteConfig.liveAnimals;
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <section aria-labelledby="payments-heading" className="space-y-3">
        <h2 id="payments-heading" className="text-xl font-semibold">
          Payment templates
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Your payment details for each method (Zelle, Cash App, PayPal, bank transfer…) and the order confirmation email they go into. Only admins can see them; they are
          never shown on the website.
        </p>
        <Link href="/admin/settings/payment-templates" className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Edit payment templates
        </Link>
      </section>
      <section aria-labelledby="live-heading" className="space-y-2">
        <h2 id="live-heading" className="text-xl font-semibold">
          Live animal shipping
        </h2>
        <p className="max-w-3xl text-sm">
          Live animals ship to: <strong>{live.shipToCountries.map((c) => countryName(c)).join(", ")}</strong>
          {live.excludedUsStates.length > 0 && <> (not {live.excludedUsStates.map((s) => regionName("US", s)).join(", ")})</>}. Supplies ship worldwide.
        </p>
        <p className="max-w-3xl text-sm text-muted-foreground">
          To change this list, edit <code>liveAnimals</code> in <code>src/config/site.ts</code> and redeploy.
        </p>
      </section>
      <section aria-labelledby="env-heading" className="space-y-3">
        <h2 id="env-heading" className="text-xl font-semibold">
          Environment checks
        </h2>
        {warnings.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-primary">All services configured.</p>
        )}
      </section>
    </div>
  );
}
