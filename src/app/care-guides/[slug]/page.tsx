import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { Markdown } from "@/components/markdown";
import { ProductCard } from "@/components/product-card";
import { getProductsBySlugs, toCard } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { getGuide, getGuides } from "@/lib/guides";
import { articleJsonLd, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props) {
  const g = getGuide((await params).slug);
  if (!g) return {};
  return pageMetadata({ title: g.title, description: g.description, path: `/care-guides/${g.slug}`, image: g.image, imageAlt: g.imageAlt, type: "article" });
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  const products = await getProductsBySlugs(guide.products);
  const path = `/care-guides/${guide.slug}`;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Care Guides", href: "/care-guides" }, { name: guide.title, href: path }]} />
      <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">{guide.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        <time dateTime={guide.published}>{formatDate(guide.published)}</time> · {guide.readingMinutes} min read
      </p>
      {guide.image && (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
          <Image src={guide.image} alt={guide.imageAlt ?? ""} fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        </div>
      )}
      <p className="mt-6 text-xl text-foreground/85">{guide.description}</p>
      <div className="mt-4">
        <Markdown>{guide.body}</Markdown>
      </div>
      {products.length > 0 && (
        <section aria-labelledby="gear-heading" className="mt-14">
          <h2 id="gear-heading" className="mb-6 text-2xl font-semibold">
            Gear mentioned in this guide
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.id} className="relative">
                <ProductCard product={toCard(p)} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <JsonLd data={articleJsonLd({ title: guide.title, description: guide.description, path, image: guide.image, published: guide.published, updated: guide.updated })} />
    </article>
  );
}
