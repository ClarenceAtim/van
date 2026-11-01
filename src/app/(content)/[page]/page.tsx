import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Markdown } from "@/components/markdown";
import { getPage, getPageSlugs } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";

/** Policy & info pages written in Markdown under content/pages/. */
export const dynamicParams = false;

type Props = { params: Promise<{ page: string }> };

export function generateStaticParams() {
  return getPageSlugs().map((page) => ({ page }));
}

export async function generateMetadata({ params }: Props) {
  const page = getPage((await params).page);
  return page ? pageMetadata({ title: page.title, description: page.description, path: `/${page.slug}` }) : {};
}

export default async function ContentPage({ params }: Props) {
  const page = getPage((await params).page);
  if (!page) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ name: page.title, href: `/${page.slug}` }]} />
      <h1 className="mt-4 text-4xl font-semibold">{page.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{page.description}</p>
      <div className="mt-6">
        <Markdown>{page.body}</Markdown>
      </div>
    </article>
  );
}
