import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { PostBody } from "@/components/blog/post-body";
import { PostCard } from "@/components/blog/post-card";
import { ShareButtons } from "@/components/blog/share-buttons";
import { ProductCard } from "@/components/product-card";
import { getProductsBySlugs, toCard } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { getAuthor, getCategoryInfo, getPost, getPosts, getRelatedPosts, lastModified, postPath } from "@/lib/blog";
import { absoluteUrl, blogPostingJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) return {};
  return pageMetadata({
    title: post.title,
    description: post.description,
    path: postPath(post),
    image: post.cover.src,
    imageAlt: post.cover.alt,
    type: "article",
    article: {
      publishedTime: post.date,
      modifiedTime: lastModified(post),
      section: getCategoryInfo(post.category)?.name ?? post.category,
      tags: post.tags,
      authors: [getAuthor(post.author).name],
    },
  });
}

export default async function BlogPostPage({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const category = getCategoryInfo(post.category)!;
  const author = getAuthor(post.author);
  const path = postPath(post);
  const [products, related] = [await getProductsBySlugs(post.related_products), getRelatedPosts(post)];
  // Keep the frontmatter order for product cards.
  products.sort((a, b) => post.related_products.indexOf(a.slug) - post.related_products.indexOf(b.slug));
  const toc = post.headings.filter((h) => h.depth === 2);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs
        items={[
          { name: "Blog", href: "/blog" },
          { name: category.name, href: `/blog/category/${category.slug}` },
          { name: post.title, href: path },
        ]}
      />
      <article className="mt-6">
        <header className="mx-auto max-w-3xl">
          <Link href={`/blog/category/${category.slug}`} className="text-sm font-semibold tracking-wide text-leaf uppercase hover:underline">
            {category.name}
          </Link>
          <h1 className="mt-2 text-4xl leading-tight font-semibold sm:text-5xl">{post.title}</h1>
          <p className="mt-4 text-xl text-foreground/80">{post.description}</p>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <li>By {author.name}</li>
            <li className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              Published <time dateTime={post.date}>{formatDate(post.date)}</time>
            </li>
            {post.updated && post.updated !== post.date && (
              <li>
                Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time>
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              {post.readingMinutes} min read
            </li>
          </ul>
        </header>

        <figure className="mx-auto mt-8 max-w-5xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-muted">
            <Image src={post.cover.src} alt={post.cover.alt} fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
          </div>
          <figcaption className="mt-2 text-right text-xs text-muted-foreground">
            Photo: {post.cover.credit}
            {post.cover.source_url && (
              <>
                {" "}
                (
                <a href={post.cover.source_url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">
                  {post.cover.license}
                </a>
                )
              </>
            )}
          </figcaption>
        </figure>

        <div className="mx-auto mt-10 grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 max-w-3xl">
            {toc.length > 2 && (
              <nav aria-labelledby="toc-heading-mobile" className="mb-8 rounded-2xl border bg-muted/40 p-5 lg:hidden">
                <h2 id="toc-heading-mobile" className="mb-2 font-sans text-sm font-semibold">
                  In this article
                </h2>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="text-primary hover:underline">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <PostBody source={post.body} />

            <div className="mt-10 border-t pt-6">
              <ShareButtons url={absoluteUrl(path)} title={post.title} />
            </div>

            <section aria-labelledby="author-heading" className="mt-8 flex gap-4 rounded-2xl border p-5">
              <div aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full bg-forest text-lg font-semibold text-primary-foreground">
                {author.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <h2 id="author-heading" className="font-sans text-base font-semibold">
                  About the author: {author.name}
                </h2>
                {author.role && <p className="text-sm text-muted-foreground">{author.role}</p>}
                <p className="mt-2 text-sm">{author.bio}</p>
              </div>
            </section>
          </div>

          {toc.length > 2 && (
            <aside className="hidden lg:block">
              <nav aria-labelledby="toc-heading" className="sticky top-32 rounded-2xl border p-5">
                <h2 id="toc-heading" className="mb-3 font-sans text-sm font-semibold">
                  In this article
                </h2>
                <ol className="space-y-2 text-sm">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          )}
        </div>
      </article>

      {products.length > 0 && (
        <section aria-labelledby="shop-heading" className="mx-auto mt-16 max-w-6xl">
          <h2 id="shop-heading" className="mb-6 text-2xl font-semibold">
            Shop the products in this guide
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <li key={p.id} className="relative">
                <ProductCard product={toCard(p)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mx-auto mt-16 max-w-6xl">
          <h2 id="related-heading" className="mb-6 text-2xl font-semibold">
            Related posts
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug}>
                <PostCard post={p} headingLevel="h3" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <JsonLd
        data={blogPostingJsonLd({
          title: post.title,
          description: post.description,
          path,
          image: post.cover.src,
          published: post.date,
          updated: post.updated,
          author,
          category: category.name,
          tags: post.tags,
          wordCount: post.body.split(/\s+/).length,
        })}
      />
      {post.faqs.length > 0 && <JsonLd data={faqJsonLd(post.faqs)} />}
    </div>
  );
}
