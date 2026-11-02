import Link from "next/link";
import { setRegionAllowed } from "@/app/actions/admin";
import { configWarnings, requireAdmin } from "@/lib/admin";
import { listRegions } from "@/lib/db/admin";

export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  const { q } = await requireAdmin();
  const regions = await listRegions(q);
  const warnings = configWarnings();
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <section aria-labelledby="payments-heading" className="space-y-3">
        <h2 id="payments-heading" className="text-xl font-semibold">Payment templates</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          The email sent when you click &quot;Send payment details&quot; on an order. Put your bank, PayPal, Zelle, Cash App, mobile money and crypto details here once.
        </p>
        <Link href="/admin/settings/payment-templates" className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Edit payment templates
        </Link>
      </section>
      <section aria-labelledby="regions-heading" className="space-y-3">
        <h2 id="regions-heading" className="text-xl font-semibold">Live animal shipping regions</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Live animals only ship to the allowed states (checked against the shipping address at checkout). Turn off states where a species is illegal or overnight delivery isn&apos;t
          reliable. Supplies can still ship everywhere in the US.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {regions.map((r) => (
            <li key={r.code}>
              <form action={setRegionAllowed} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <input type="hidden" name="code" value={r.code} />
                <input type="hidden" name="allowed" value={String(!r.allowed)} />
                <span>{r.name}</span>
                <button type="submit" className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.allowed ? "bg-primary text-primary-foreground" : "bg-destructive/15 text-destructive"}`} aria-label={`${r.name}: ${r.allowed ? "allowed" : "blocked"}. Toggle`}>
                  {r.allowed ? "Allowed" : "Blocked"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="env-heading" className="space-y-3">
        <h2 id="env-heading" className="text-xl font-semibold">Environment checks</h2>
        {warnings.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        ) : (
          <p className="text-sm text-primary">All services configured.</p>
        )}
      </section>
    </div>
  );
}
