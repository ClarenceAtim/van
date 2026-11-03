import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { BlogSearch } from "@/components/blog/blog-search";
import { PostCard } from "@/components/blog/post-card";
import { formatDate } from "@/lib/format";
import { BLOG_CATEGORIES, getCategoryInfo, getPosts, postPath, type Post } from "@/lib/blog";
import { cn } from "@/lib/utils";

export function CategoryNav({ active }: { active?: string }) {
  const used = new Set(getPosts().map((p) => p.category));
  const items = [{ slug: "", name: "All posts" }, ...BLOG_CATEGORIES.filter((c) => used.has(c.slug))];
  return (
    <nav aria-label="Blog categories">
      <ul className="flex flex-wrap gap-2">
        {items.map((c) => {
          const current = (active ?? "") === c.slug;
          return (
            <li key={c.slug || "all"}>
              <Link
                href={c.slug ? `/blog/category/${c.slug}` : "/blog"}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                  current ? "border-forest bg-forest text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function FeaturedPost({ post }: { post: Post }) {
  return (
    <article className="group grid overflow-hidden rounded-3xl border bg-card md:grid-cols-[1.2fr_1fr]">
      <Link href={postPath(post)} className="relative block aspect-[16/9] bg-muted md:aspect-auto md:min-h-80" tabIndex={-1} aria-hidden>
        <Image src={post.cover.src} alt={post.cover.alt} fill preload fetchPriority="high" sizes="(min-width: 768px) 640px, 100vw" className="object-cover" />
      </Link>
      <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-wide text-leaf uppercase">
          Featured · {getCategoryInfo(post.category)?.name}
        </p>
        <h2 className="text-3xl leading-tight font-semibold">
          <Link href={postPath(post)} className="hover:underline focus-visible:underline">
            {post.title}
          </Link>
        </h2>
        <p className="text-muted-foreground">{post.description}</p>
        <p className="text-sm text-muted-foreground">
          <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.readingMinutes} min read
        </p>
      </div>
    </article>
  );
}

function Pagination({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const href = (n: number) => (n === 1 ? base : `${base}/page/${n}`);
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted">
          Newer posts
        </Link>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <Link
          key={n}
          href={href(n)}
          aria-current={n === page ? "page" : undefined}
          aria-label={`Page ${n}`}
          className={cn("inline-flex size-10 items-center justify-center rounded-lg border text-sm font-medium", n === page ? "border-forest bg-forest text-primary-foreground" : "hover:bg-muted")}
        >
          {n}
        </Link>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} rel="next" className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted">
          Older posts
        </Link>
      )}
    </nav>
  );
}

/** Blog home and its paginated pages: featured post (page 1), category filter, search and the post grid. */
export function BlogIndex({
  title,
  intro,
  posts,
  page,
  pages,
  base,
  crumbs,
  activeCategory,
  featured,
}: {
  title: string;
  intro: string;
  posts: Post[];
  page: number;
  pages: number;
  base: string;
  crumbs: Crumb[];
  activeCategory?: string;
  featured?: Post | null;
}) {
  const searchable = getPosts().map((p) => ({ slug: p.slug, title: p.title, description: p.description, category: getCategoryInfo(p.category)?.name ?? p.category, tags: p.tags }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs items={crumbs} />
      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-semibold sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{intro}</p>
        </div>
        <BlogSearch posts={searchable} />
      </div>
      <div className="mt-8">
        <CategoryNav active={activeCategory} />
      </div>
      {featured && (
        <div className="mt-10">
          <FeaturedPost post={featured} />
        </div>
      )}
      <section aria-labelledby="latest-heading" className="mt-12">
        <h2 id="latest-heading" className="mb-6 text-2xl font-semibold">
          {activeCategory ? "Articles" : page === 1 ? "Latest articles" : `Articles · page ${page}`}
        </h2>
        {posts.length === 0 ? (
          <p className="text-muted-foreground">No articles here yet. Check back soon.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <li key={p.slug}>
                <PostCard post={p} headingLevel="h3" priority={!featured && i < 3} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <Pagination page={page} pages={pages} base={base} />
    </div>
  );
}
