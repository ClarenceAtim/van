import Link from "next/link";
import { getAllProducts } from "@/lib/catalog";
import { productPath } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Image Credits",
  description: "Attribution and licenses for the product photographs used on ScaleHaven Reptiles.",
  path: "/credits",
});

export default async function CreditsPage() {
  const products = await getAllProducts();
  const credited = products.flatMap((p) => p.images.filter((i) => !i.placeholder).map((img) => ({ p, img })));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl font-semibold">Image credits</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Many of our product photos are generously shared by photographers under free licenses. We thank them and credit each one below. Licenses marked “CC BY”
        or “CC BY-SA” require attribution; follow the source link for the full license and original file. Photos marked “Representative photo” on a product
        page show the same species or type of item rather than the exact one you will receive.
      </p>
      <div className="mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Photograph attributions</caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Product</th>
              <th scope="col" className="px-4 py-3 font-semibold">Photographer / credit</th>
              <th scope="col" className="px-4 py-3 font-semibold">License</th>
              <th scope="col" className="px-4 py-3 font-semibold">Source</th>
            </tr>
          </thead>
          <tbody>
            {credited.map(({ p, img }) => (
              <tr key={img.url} className="border-t align-top">
                <td className="px-4 py-3">
                  <Link href={productPath(p)} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{img.credit}</td>
                <td className="px-4 py-3 whitespace-nowrap">{img.license}</td>
                <td className="px-4 py-3">
                  {img.source_url ? (
                    <a href={img.source_url} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2">
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
    </div>
  );
}
