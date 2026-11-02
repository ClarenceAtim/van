import { deleteAddress } from "@/app/actions/account";
import { AddressForm } from "@/components/account/address-form";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth/server";
import { listAddresses } from "@/lib/db/account";
import { db } from "@/lib/db/pool";

export const metadata = { title: "Addresses" };


export default async function AddressesPage() {
  const profile = await requireProfile("/account/addresses");
  const addresses = await listAddresses(db(), profile.id);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Addresses</h1>
      {addresses.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-xl border p-4 text-sm">
              {a.is_default && <p className="mb-1 text-xs font-semibold tracking-wide text-primary uppercase">Default</p>}
              <address className="not-italic">
                {a.full_name}
                <br />
                {a.line1}
                {a.line2 && <>, {a.line2}</>}
                <br />
                {a.city}, {a.region} {a.postal_code}
                {a.phone && (
                  <>
                    <br />
                    {a.phone}
                  </>
                )}
              </address>
              <form action={deleteAddress} className="mt-3">
                <input type="hidden" name="id" value={a.id} />
                <Button variant="outline" size="sm" type="submit">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <section aria-labelledby="new-address" className="max-w-xl">
        <h2 id="new-address" className="mb-4 text-xl font-semibold">
          Add an address
        </h2>
        <AddressForm />
      </section>
    </div>
  );
}
