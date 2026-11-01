import { ProductCard } from "@/components/product-card";
import { SearchBox } from "@/components/search-box";
import { searchProducts, toCard } from "@/lib/catalog";
import { rateLimit } from "@/lib/rate-limit";
import { pageMetadata } from "@/lib/seo";
import { searchQuerySchema } from "@/lib/validation";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props) {
  const q = (await searchParams).q?.slice(0, 60);
  return pageMetadata({ title: q ? `Search results for “${q}”` : "Search", description: "Search our captive-bred reptiles and reptile supplies.", path: "/search", noIndex: true });
}

export default async function SearchPage({ searchParams }: Props) {
  const parsed = searchQuerySchema.safeParse({ q: (await searchParams).q ?? "" });
  const q = parsed.success ? parsed.data.q : "";
  const allowed = q ? await rateLimit("search") : true;
  const results = q && allowed ? await searchProducts(q, 48) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-4xl font-semibold">{q ? <>Results for “{q}”</> : "Search"}</h1>
      <SearchBox className="mt-6 max-w-xl" />
      {!allowed ? (
        <p className="mt-8 text-destructive">Too many searches. Please wait a moment and try again.</p>
      ) : q ? (
        <>
          <p className="mt-6 text-muted-foreground" aria-live="polite">
            {results.length} {results.length === 1 ? "product" : "products"} found
          </p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((p) => (
              <li key={p.id} className="relative">
                <ProductCard product={toCard(p)} headingLevel="h2" />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-6 text-muted-foreground">Type at least two characters to search.</p>
      )}
    </div>
  );
}
