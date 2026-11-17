import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BLOG_CATEGORIES, getPostsByCategory, postPath } from "@/lib/blog";
import { getAllProducts, getCategories } from "@/lib/catalog";
import { productPath } from "@/lib/format";
import { getPages } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Sitemap",
  description: "Every shop category, product, blog category and article on ScaleHaven Reptiles, plus our help and policy pages, on one page.",
  path: "/sitemap",
});

const linkClass = "text-primary hover:underline";

export default async function SitemapPage() {
  const [products, categories] = await Promise.all([getAllProducts(), getCategories()]);
  const blogCategories = BLOG_CATEGORIES.map((c) => ({ ...c, posts: getPostsByCategory(c.slug) })).filter((c) => c.posts.length > 0);
  const pages = [
    ...getPages().map((p) => ({ href: `/${p.slug}`, label: p.title })),
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact Us" },
  ].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Sitemap", href: "/sitemap" }]} />
      <h1 className="mt-4 text-4xl font-semibold">Sitemap</h1>
      <p className="mt-3 text-muted-foreground">
        Every page on our site, in one place. Looking for something specific? Try the search box at the top of the page.
      </p>

      <section aria-labelledby="shop-heading" className="mt-10">
        <h2 id="shop-heading" className="text-2xl font-semibold">
          <Link href="/shop" className="hover:underline">
            Shop
          </Link>
        </h2>
        <div className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.slug}>
              <h3 className="font-sans text-lg font-semibold">
                <Link href={`/shop/${c.slug}`} className={linkClass}>
                  {c.name}
                </Link>
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {products
                  .filter((p) => p.category === c.slug)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p) => (
                    <li key={p.slug}>
                      <Link href={productPath(p)} className="text-foreground/85 hover:text-foreground hover:underline">
                        {p.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="blog-heading" className="mt-12">
        <h2 id="blog-heading" className="text-2xl font-semibold">
          <Link href="/blog" className="hover:underline">
            Blog
          </Link>
        </h2>
        <div className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {blogCategories.map((c) => (
            <div key={c.slug}>
              <h3 className="font-sans text-lg font-semibold">
                <Link href={`/blog/category/${c.slug}`} className={linkClass}>
                  {c.name}
                </Link>
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {c.posts.map((p) => (
                  <li key={p.slug}>
                    <Link href={postPath(p)} className="text-foreground/85 hover:text-foreground hover:underline">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="pages-heading" className="mt-12">
        <h2 id="pages-heading" className="text-2xl font-semibold">
          Help & information
        </h2>
        <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className={linkClass}>
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
