import Link from "next/link";
import { toggleProductFlag } from "@/app/actions/admin";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { listProducts } from "@/lib/db/admin";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Products" };


function Flag({ id, flag, value }: { id: string; flag: "featured" | "active"; value: boolean }) {
  return (
    <form action={toggleProductFlag}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="flag" value={flag} />
      <input type="hidden" name="value" value={String(!value)} />
      <button type="submit" className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} aria-label={`${flag}: ${value ? "on" : "off"}. Toggle`}>
        {value ? "Yes" : "No"}
      </button>
    </form>
  );
}

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: database } = await requireAdmin();
  const { q = "" } = await searchParams;
  const rows = await listProducts(database, q.trim().slice(0, 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Products ({rows.length})</h1>
        <Link href="/admin/products/new" className={buttonVariants()}>New product</Link>
      </div>
      <form className="flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="admin-q">Search products</label>
        <input id="admin-q" name="q" defaultValue={q} placeholder="Search name or SKU" className="h-10 w-64 rounded-lg border border-input px-3 text-sm" />
        <button className={buttonVariants({ variant: "outline" })}>Search</button>
      </form>
      <p className="text-sm text-muted-foreground">
        GitHub is the source of truth for products. After editing here, run <code>npm run export:products</code> and commit, or the next sync will overwrite your changes.
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-3 py-2">Name</th>
              <th scope="col" className="px-3 py-2">SKU</th>
              <th scope="col" className="px-3 py-2">Category</th>
              <th scope="col" className="px-3 py-2 text-right">Price</th>
              <th scope="col" className="px-3 py-2 text-right">Stock</th>
              <th scope="col" className="px-3 py-2">Featured</th>
              <th scope="col" className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2"><Link href={`/admin/products/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link></td>
                <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-3 py-2">{p.category}</td>
                <td className="px-3 py-2 text-right">{formatMoney(p.price_cents)}</td>
                <td className={`px-3 py-2 text-right ${p.stock_quantity <= 3 ? "font-semibold text-amber-700" : ""}`}>{p.stock_quantity}</td>
                <td className="px-3 py-2"><Flag id={p.id} flag="featured" value={p.featured} /></td>
                <td className="px-3 py-2"><Flag id={p.id} flag="active" value={p.active} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
