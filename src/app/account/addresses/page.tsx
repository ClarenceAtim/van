import { deleteAddress } from "@/app/actions/account";
import { AddressForm } from "@/components/account/address-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Addresses" };

type Address = { id: string; full_name: string; line1: string; line2: string | null; city: string; region: string; postal_code: string; phone: string | null; is_default: boolean };

export default async function AddressesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  const addresses = (data ?? []) as Address[];
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
