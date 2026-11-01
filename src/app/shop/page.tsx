import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductBrowser } from "@/components/product-browser";
import { getAllProducts, getCategories, toCard } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Shop All Reptiles & Reptile Supplies",
  description: "Browse captive-bred reptiles, enclosures, UVB lighting, heating, substrate, food and supplements. Filter by category, price and care level.",
  path: "/shop",
});

export default async function ShopPage() {
  const [products, categories] = await Promise.all([getAllProducts(), getCategories()]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs items={[{ name: "Shop", href: "/shop" }]} />
      <h1 className="mt-4 mb-2 text-4xl font-semibold">Shop all</h1>
      <p className="mb-8 max-w-2xl text-muted-foreground">Everything we sell, from hatchling geckos to the UVB tubes and thermostats we trust in our own animal rooms.</p>
      <ProductBrowser products={products.map(toCard)} categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
    </div>
  );
}
