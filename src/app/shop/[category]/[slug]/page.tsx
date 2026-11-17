import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, PackageCheck, ShieldCheck, Star, Truck } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AddToCart } from "@/components/cart/add-to-cart";
import { JsonLd } from "@/components/json-ld";
import { Markdown } from "@/components/markdown";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product/gallery";
import { WishlistButton } from "@/components/product/wishlist-button";
import { siteConfig } from "@/config/site";
import { getAlsoBought } from "@/lib/also-bought";
import { extractFaqs, getCareGuideForSpecies, postPath } from "@/lib/blog";
import { getAllProducts, getCategory, getProduct, getRelated, getReviews, toCard } from "@/lib/catalog";
import { formatDate, formatMoney, productPath } from "@/lib/format";
import { faqJsonLd, pageMetadata, productJsonLd } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ category: string; slug: string }> };

export async function generateStaticParams() {
  return (await getAllProducts()).map((p) => ({ category: p.category, slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  const p = await getProduct(category, slug);
  if (!p) return {};
  return pageMetadata({
    title: p.seo_title,
    description: p.seo_description,
    path: productPath(p),
    image: p.images[0]?.url,
    imageAlt: p.images[0]?.alt,
  });
}

function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-4 ${i <= Math.round(value) ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"}`} aria-hidden />
      ))}
    </span>
  );
}

export default async function ProductPage({ params }: Props) {
  const { category: categorySlug, slug } = await params;
  const [product, category] = await Promise.all([getProduct(categorySlug, slug), getCategory(categorySlug)]);
  if (!product || !category) notFound();
  const related = await getRelated(product);
  const [{ reviews, rating }, alsoBought] = await Promise.all([getReviews(product.id), getAlsoBought(product, related.map((p) => p.id))]);
  const faqs = extractFaqs(product.long_description);
  const onSale = product.compare_at_price_cents != null && product.compare_at_price_cents > product.price_cents;
  const lowStock = product.stock_quantity > 0 && product.stock_quantity <= 3;
  const careGuide = product.is_live_animal ? getCareGuideForSpecies(product.species_scientific_name) : null;

  const careRows = product.is_live_animal
    ? [
        ["Scientific name", product.species_scientific_name],
        ["Care level", product.care_level],
        ["Adult size", product.adult_size],
        ["Lifespan", product.lifespan],
        ["Diet", product.diet],
        ["Temperature", product.temperature_range],
        ["Humidity", product.humidity_range],
      ].filter((r): r is [string, string] => !!r[1])
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs
        items={[
          { name: "Shop", href: "/shop" },
          { name: category.name, href: `/shop/${category.slug}` },
          { name: product.name, href: productPath(product) },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">{product.name}</h1>
            {product.species_scientific_name && <p className="text-muted-foreground italic">{product.species_scientific_name}</p>}
            {rating && (
              <a href="#reviews" className="inline-flex items-center gap-2 text-sm hover:underline">
                <Stars value={rating.average} label={`Rated ${rating.average} out of 5`} />
                {rating.count} {rating.count === 1 ? "review" : "reviews"}
              </a>
            )}
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-semibold">{formatMoney(product.price_cents, product.currency)}</p>
              {onSale && (
                <p className="text-lg text-muted-foreground line-through">
                  <span className="sr-only">Was </span>
                  {formatMoney(product.compare_at_price_cents!, product.currency)}
                </p>
              )}
            </div>
            <p className="text-lg text-foreground/85">{product.short_description}</p>
          </div>

          <p className={`flex items-center gap-2 font-medium ${product.stock_quantity === 0 ? "text-destructive" : lowStock ? "text-amber-700" : "text-primary"}`}>
            <PackageCheck className="size-5" aria-hidden />
            {product.stock_quantity === 0 ? "Sold out" : lowStock ? `Only ${product.stock_quantity} left` : "In stock — ready to ship"}
          </p>

          <div className="space-y-3">
            <AddToCart slug={product.slug} name={product.name} stock={product.stock_quantity} withQuantity />
            <WishlistButton slug={product.slug} />
          </div>

          {product.is_live_animal ? (
            <div className="space-y-2 rounded-xl border border-sand-strong bg-sand/50 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4" aria-hidden /> Live animal notice
              </p>
              <p>
                Ships overnight {siteConfig.shipping.liveAnimalShipDays} within the US, only when weather along the route is safe. Shipping depends on your local laws; at
                checkout you&apos;ll confirm that you are {siteConfig.liveAnimals.minimumAge}+ and agree to our{" "}
                <Link href="/terms#live-animals" className="font-medium underline underline-offset-2">
                  Live Animal Policy
                </Link>
                .
              </p>
            </div>
          ) : null}

          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" aria-hidden />
              {product.is_live_animal ? "Live Arrival Guarantee" : "30-day returns on unopened supplies"}
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-5 text-primary" aria-hidden />
              {product.is_live_animal ? "Insulated overnight packaging" : "Ships worldwide"}
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
        </div>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="description-heading">
          <h2 id="description-heading" className="mb-2 text-2xl font-semibold">
            About this {product.is_live_animal ? "animal" : "product"}
          </h2>
          <Markdown headingOffset={1}>{product.long_description}</Markdown>
        </section>

        {careRows.length > 0 && (
          <section aria-labelledby="care-heading" className="h-fit rounded-2xl border p-5">
            <h2 id="care-heading" className="mb-3 text-xl font-semibold">Care sheet</h2>
            <table className="w-full text-sm">
              <tbody>
                {careRows.map(([k, v]) => (
                  <tr key={k} className="border-b last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left align-top font-medium text-muted-foreground">
                      {k}
                    </th>
                    <td className={`py-2 ${k === "Scientific name" ? "italic" : ""} ${k === "Care level" ? "capitalize" : ""}`}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {careGuide ? (
              <Link href={postPath(careGuide)} className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4">
                Read our {careGuide.title.replace(/:.*$/, "")}
              </Link>
            ) : (
              <Link href="/blog/category/care-guides" className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4">
                Browse our reptile care guides
              </Link>
            )}
          </section>
        )}
      </div>

      <section id="reviews" aria-labelledby="reviews-heading" className="mt-14 scroll-mt-28">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="reviews-heading" className="text-2xl font-semibold">
            Customer reviews
          </h2>
          <Link href={`/account/reviews/new?product=${product.slug}`} className="text-sm font-medium text-primary underline underline-offset-4">
            Write a review
          </Link>
        </div>
        {reviews.length === 0 ? (
          <p className="text-muted-foreground">No reviews yet. Reviews come from verified buyers only.</p>
        ) : (
          <ul className="space-y-6">
            {reviews.map((r) => (
              <li key={r.id} className="border-b pb-6 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} label={`${r.rating} out of 5 stars`} />
                  <p className="font-semibold">{r.title}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.author_name} · Verified buyer · {formatDate(r.created_at)}
                </p>
                <p className="mt-2 whitespace-pre-line">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="mb-6 text-2xl font-semibold">
            You may also need
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id} className="relative">
                <ProductCard product={toCard(p)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {alsoBought.length > 0 && (
        <section aria-labelledby="also-bought-heading" className="mt-16">
          <h2 id="also-bought-heading" className="mb-6 text-2xl font-semibold">
            Customers also buy
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {alsoBought.map((p) => (
              <li key={p.id} className="relative">
                <ProductCard product={toCard(p)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <JsonLd data={productJsonLd(product, rating, reviews)} />
      {faqs.length > 0 && <JsonLd data={faqJsonLd(faqs)} />}
    </div>
  );
}
