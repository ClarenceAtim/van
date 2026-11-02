import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Box, Bug, Leaf, Sun, Thermometer, Turtle } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { NewsletterForm } from "@/components/newsletter-form";
import { ProductCard } from "@/components/product-card";
import { TrustBadges } from "@/components/trust-badges";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getBestSellers, getCategories, getFeatured, getProductsByCategory, toCard } from "@/lib/catalog";
import { PostCard } from "@/components/blog/post-card";
import { getPosts } from "@/lib/blog";
import { pageMetadata, websiteJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export const metadata = {
  ...pageMetadata({
    title: `${siteConfig.name} – Captive-Bred Reptiles & Supplies`,
    description: siteConfig.description,
    path: "/",
  }),
  title: { absolute: `${siteConfig.name} – Captive-Bred Reptiles & Supplies` },
};

const CATEGORY_ICONS: Record<string, typeof Turtle> = {
  "live-reptiles": Turtle,
  enclosures: Box,
  "heating-lighting": Sun,
  "substrate-decor": Leaf,
  "food-supplements": Bug,
  "care-accessories": Thermometer,
};

export default async function HomePage() {
  const [featured, bestSellers, categories, animals] = await Promise.all([getFeatured(12), getBestSellers(8), getCategories(), getProductsByCategory("live-reptiles")]);
  const featuredAnimals = featured.filter((p) => p.is_live_animal).slice(0, 4);
  const featuredSupplies = bestSellers.filter((p) => !p.is_live_animal).slice(0, 4);
  const latestPosts = getPosts().slice(0, 3);
  const hero = animals.find((p) => p.slug === "panther-chameleon-ambilobe")?.images[0] ?? animals[0]?.images[0];

  return (
    <>
      <section className="relative overflow-hidden bg-forest text-primary-foreground">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div className="space-y-6">
            <p className="text-sm font-semibold tracking-[0.2em] text-sand uppercase">Captive bred · Health guaranteed</p>
            <h1 className="text-4xl font-semibold sm:text-5xl lg:text-6xl">Healthy reptiles, raised right.</h1>
            <p className="max-w-lg text-lg text-primary-foreground/85">
              Hand-raised snakes, geckos, lizards and tortoises — plus the enclosures, UVB and heating we actually use in our own facility.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/shop/live-reptiles" className={cn(buttonVariants({ size: "lg" }), "bg-sand text-forest hover:bg-sand/90")}>
                Shop live reptiles
              </Link>
              <Link href="/shop" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "border-sand/60 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground")}>
                Browse supplies
              </Link>
            </div>
          </div>
          {hero && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
              <Image src={hero.url} alt={hero.alt} fill preload fetchPriority="high" sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-14">
        <section aria-labelledby="trust-heading">
          <h2 id="trust-heading" className="sr-only">
            Why buy from us
          </h2>
          <TrustBadges />
        </section>

        <section aria-labelledby="featured-heading">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 id="featured-heading" className="text-3xl font-semibold">Featured animals</h2>
              <p className="mt-1 text-muted-foreground">Feeding well, handled daily and ready for their new homes.</p>
            </div>
            <Link href="/shop/live-reptiles" className="hidden shrink-0 items-center gap-1 font-medium text-primary hover:underline sm:inline-flex">
              All animals <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredAnimals.map((p) => (
              <li key={p.id} className="relative">
                <ProductCard product={toCard(p)} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="mb-6 text-3xl font-semibold">Shop by category</h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {categories.map((c) => {
              const Icon = CATEGORY_ICONS[c.slug] ?? Leaf;
              return (
                <li key={c.slug}>
                  <Link href={`/shop/${c.slug}`} className="group flex h-full flex-col gap-3 rounded-2xl bg-sand/50 p-5 transition-colors hover:bg-sand sm:p-6">
                    <Icon className="size-9 text-primary" aria-hidden />
                    <span className="font-heading text-lg font-semibold sm:text-xl">{c.name}</span>
                    <span className="hidden text-sm text-muted-foreground sm:block">{c.description}</span>
                    <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Shop now <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="bestsellers-heading">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 id="bestsellers-heading" className="text-3xl font-semibold">Best-selling supplies</h2>
              <p className="mt-1 text-muted-foreground">The gear our keepers reorder most.</p>
            </div>
            <Link href="/shop?sort=popular" className="hidden shrink-0 items-center gap-1 font-medium text-primary hover:underline sm:inline-flex">
              Shop supplies <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredSupplies.map((p) => (
              <li key={p.id} className="relative">
                <ProductCard product={toCard(p)} />
              </li>
            ))}
          </ul>
        </section>

        {latestPosts.length > 0 && (
          <section aria-labelledby="blog-heading" className="rounded-3xl bg-muted p-6 sm:p-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <BookOpen className="size-7 text-primary" aria-hidden />
                <h2 id="blog-heading" className="text-3xl font-semibold">From the blog</h2>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                All articles <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-5 md:grid-cols-3">
              {latestPosts.map((p) => (
                <li key={p.slug}>
                  <PostCard post={p} headingLevel="h3" />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="newsletter-heading" className="grid items-center gap-6 rounded-3xl border p-6 sm:p-10 md:grid-cols-2">
          <div>
            <h2 id="newsletter-heading" className="text-3xl font-semibold">Get care tips & first pick of new hatchlings</h2>
            <p className="mt-2 text-muted-foreground">One email a month. Unsubscribe any time.</p>
          </div>
          <NewsletterForm />
        </section>
      </div>
      <JsonLd data={websiteJsonLd()} />
    </>
  );
}
