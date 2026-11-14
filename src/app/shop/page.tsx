import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ProductBrowser } from "@/components/product-browser";
import { getAllProducts, getCategories, toCard } from "@/lib/catalog";
import { applyListing, hasActiveFilters, parseListingParams, type ListingSearchParams } from "@/lib/listing";
import { itemListJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = { searchParams: Promise<ListingSearchParams> };

export async function generateMetadata({ searchParams }: Props) {
  const params = parseListingParams(await searchParams);
  // Paginated pages self-canonicalise; filtered views keep the clean canonical.
  const path = params.page > 1 && !hasActiveFilters(params) ? `/shop?page=${params.page}` : "/shop";
  return pageMetadata({
    title: "Shop All Reptiles & Reptile Supplies",
    description: "Browse captive-bred reptiles, enclosures, UVB lighting, heating, substrate, food and supplements. Filter by category, price and care level.",
    path,
  });
}

export default async function ShopPage({ searchParams }: Props) {
  const params = parseListingParams(await searchParams);
  const [all, categories] = await Promise.all([getAllProducts(), getCategories()]);
  const { visible, total, pages, current } = applyListing(all, params);
  const cards = visible.map(toCard);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs items={[{ name: "Shop", href: "/shop" }]} />
      <h1 className="mt-4 mb-2 text-4xl font-semibold">Shop all</h1>
      <p className="mb-8 max-w-2xl text-muted-foreground">Everything we sell, from hatchling geckos to the UVB tubes and thermostats we trust in our own animal rooms.</p>
      <ProductBrowser
        products={cards}
        total={total}
        pages={pages}
        current={current}
        params={params}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        showCare={all.some((p) => p.care_level)}
      />
      <JsonLd data={itemListJsonLd(cards)} />
    </div>
  );
}
