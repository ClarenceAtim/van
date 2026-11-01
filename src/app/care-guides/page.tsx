import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate } from "@/lib/format";
import { getGuides } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Reptile Care Guides",
  description: "Free, practical care guides for leopard geckos, ball pythons, bearded dragons and bioactive enclosures, written by experienced keepers.",
  path: "/care-guides",
});

export default function GuidesPage() {
  const guides = getGuides();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Care Guides", href: "/care-guides" }]} />
      <h1 className="mt-4 text-4xl font-semibold">Reptile care guides</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">Practical setups that work — the same husbandry we use for our own animals.</p>
      <ul className="mt-10 grid gap-6 md:grid-cols-2">
        {guides.map((g, i) => (
          <li key={g.slug}>
            <Link href={`/care-guides/${g.slug}`} className="group block h-full overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
              {g.image && (
                <div className="relative aspect-[16/9] bg-muted">
                  <Image src={g.image} alt={g.imageAlt ?? ""} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" priority={i < 2} />
                </div>
              )}
              <div className="space-y-2 p-5">
                <p className="text-xs font-semibold tracking-wide text-leaf uppercase">
                  {formatDate(g.published)} · {g.readingMinutes} min read
                </p>
                <h2 className="text-2xl font-semibold group-hover:underline">{g.title}</h2>
                <p className="text-muted-foreground">{g.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
