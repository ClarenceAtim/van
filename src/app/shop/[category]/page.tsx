import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ProductBrowser } from "@/components/product-browser";
import { siteConfig } from "@/config/site";
import { getCategories, getCategory, getProductsByCategory, toCard } from "@/lib/catalog";
import { applyListing, hasActiveFilters, parseListingParams, type ListingSearchParams } from "@/lib/listing";
import { itemListJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ category: string }>; searchParams: Promise<ListingSearchParams> };

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params, searchParams }: Props) {
  const category = await getCategory((await params).category);
  if (!category) return {};
  const listing = parseListingParams(await searchParams);
  // Paginated pages self-canonicalise; filtered views keep the clean canonical.
  const path = listing.page > 1 && !hasActiveFilters(listing) ? `/shop/${category.slug}?page=${listing.page}` : `/shop/${category.slug}`;
  return pageMetadata({ title: category.seo_title, description: category.seo_description, path });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getCategory((await params).category);
  if (!category) notFound();
  const listing = parseListingParams(await searchParams);
  const all = await getProductsByCategory(category.slug);
  const { visible, total, pages, current } = applyListing(all, listing);
  const cards = visible.map(toCard);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs items={[{ name: "Shop", href: "/shop" }, { name: category.name, href: `/shop/${category.slug}` }]} />
      <h1 className="mt-4 mb-2 text-4xl font-semibold">{category.name}</h1>
      <p className="mb-6 max-w-3xl text-muted-foreground">{category.description}</p>
      {category.slug === "live-reptiles" && (
        <p className="mb-8 rounded-xl border border-sand-strong bg-sand/50 p-4 text-sm">
          <strong>Live animal shipping:</strong> animals ship overnight {siteConfig.shipping.liveAnimalShipDays} within the US when weather along the route is safe, and only to states
          where the species is legal to own. Buyers must be {siteConfig.liveAnimals.minimumAge}+.{" "}
          <Link href="/live-arrival-guarantee" className="font-medium text-primary underline underline-offset-4">
            Live Arrival Guarantee
          </Link>
        </p>
      )}
      <ProductBrowser products={cards} total={total} pages={pages} current={current} params={listing} showCare={all.some((p) => p.care_level)} />
      <JsonLd data={itemListJsonLd(cards)} />
    </div>
  );
}
