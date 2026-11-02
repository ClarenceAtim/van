import Link from "next/link";
import { getPosts, postPath } from "@/lib/blog";
import { getAllProducts } from "@/lib/catalog";
import { productPath } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Image Credits",
  description: "Attribution and licenses for the product and blog photographs used on ScaleHaven Reptiles.",
  path: "/credits",
});

type Row = { key: string; name: string; href: string; credit: string; license: string; source_url: string };

function CreditsTable({ caption, label, rows }: { caption: string; label: string; rows: Row[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">{label}</th>
            <th scope="col" className="px-4 py-3 font-semibold">Photographer / credit</th>
            <th scope="col" className="px-4 py-3 font-semibold">License</th>
            <th scope="col" className="px-4 py-3 font-semibold">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t align-top">
              <td className="px-4 py-3">
                <Link href={r.href} className="font-medium hover:underline">
                  {r.name}
                </Link>
              </td>
              <td className="px-4 py-3">{r.credit}</td>
              <td className="px-4 py-3 whitespace-nowrap">{r.license}</td>
              <td className="px-4 py-3">
                {r.source_url ? (
                  <a href={r.source_url} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2">
                    View original
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function CreditsPage() {
  const products = await getAllProducts();
  const productRows: Row[] = products.flatMap((p) =>
    p.images.filter((i) => !i.placeholder).map((img) => ({ key: img.url, name: p.name, href: productPath(p), credit: img.credit, license: img.license, source_url: img.source_url })),
  );
  const postRows: Row[] = getPosts().map((p) => ({ key: p.slug, name: p.title, href: postPath(p), ...p.cover }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl font-semibold">Image credits</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Many of our photos are generously shared by photographers under free licenses. We thank them and credit each one below. Licenses marked “CC BY”
        or “CC BY-SA” require attribution; follow the source link for the full license and original file. Photos marked “Representative photo” on a product
        page show the same species or type of item rather than the exact one you will receive.
      </p>
      <h2 className="mt-10 text-2xl font-semibold">Product photos</h2>
      <CreditsTable caption="Product photograph attributions" label="Product" rows={productRows} />
      <h2 className="mt-12 text-2xl font-semibold">Blog cover photos</h2>
      <CreditsTable caption="Blog cover photograph attributions" label="Article" rows={postRows} />
    </div>
  );
}
