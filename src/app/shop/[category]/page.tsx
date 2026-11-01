import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductBrowser } from "@/components/product-browser";
import { siteConfig } from "@/config/site";
import { getCategories, getCategory, getProductsByCategory, toCard } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ category: string }> };

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props) {
  const category = await getCategory((await params).category);
  if (!category) return {};
  return pageMetadata({ title: category.seo_title, description: category.seo_description, path: `/shop/${category.slug}` });
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategory((await params).category);
  if (!category) notFound();
  const products = await getProductsByCategory(category.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs items={[{ name: "Shop", href: "/shop" }, { name: category.name, href: `/shop/${category.slug}` }]} />
      <h1 className="mt-4 mb-2 text-4xl font-semibold">{category.name}</h1>
      <p className="mb-6 max-w-3xl text-muted-foreground">{category.description}</p>
      {category.slug === "live-reptiles" && (
        <p className="mb-8 rounded-xl border border-sand-strong bg-sand/50 p-4 text-sm">
          <strong>Live animal shipping:</strong> animals ship overnight {siteConfig.shipping.liveAnimalShipDays} when weather along the route is safe, and only to states where
          the species is legal to own. Buyers must be {siteConfig.liveAnimals.minimumAge}+.{" "}
          <Link href="/live-arrival-guarantee" className="font-medium text-primary underline underline-offset-4">
            Live Arrival Guarantee
          </Link>
        </p>
      )}
      <ProductBrowser products={products.map(toCard)} />
    </div>
  );
}
