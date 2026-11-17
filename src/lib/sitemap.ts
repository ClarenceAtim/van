import { BLOG_CATEGORIES, getPosts, getPostsByCategory, lastModified, pageCount, postPath } from "@/lib/blog";
import { getAllProducts, getCategories } from "@/lib/catalog";
import { productPath } from "@/lib/format";
import { getPages } from "@/lib/pages";
import { absoluteUrl } from "@/lib/seo";

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: number;
  images?: string[];
};
export type SitemapGroup = "pages" | "products" | "blog";
export const SITEMAP_GROUPS: SitemapGroup[] = ["pages", "products", "blog"];

/** Above this many URLs, /sitemap.xml becomes an index of one sitemap per group. */
export const SITEMAP_INDEX_THRESHOLD = 1000;

const day = (d: string | Date) => new Date(d).toISOString().slice(0, 10);
const latest = (dates: (string | undefined)[]) => dates.filter(Boolean).sort().at(-1);

/**
 * Every public, indexable URL, grouped. Private pages (admin, account, cart,
 * checkout, API, login) are never listed and are also blocked in robots.txt.
 */
export async function getSitemapGroups(): Promise<Record<SitemapGroup, SitemapEntry[]>> {
  const [products, categories] = await Promise.all([getAllProducts(), getCategories()]);
  const posts = getPosts();
  const productDate = (p: { updated_at: string }) => day(p.updated_at);
  const newestProduct = latest(products.map(productDate));
  const newestPost = latest(posts.map(lastModified));
  const newest = latest([newestProduct, newestPost]);

  const pages: SitemapEntry[] = [
    { loc: absoluteUrl("/"), lastmod: newest, changefreq: "daily", priority: 1 },
    { loc: absoluteUrl("/shop"), lastmod: newestProduct, changefreq: "daily", priority: 0.9 },
    ...categories.map((c) => ({
      loc: absoluteUrl(`/shop/${c.slug}`),
      lastmod: latest(products.filter((p) => p.category === c.slug).map(productDate)),
      changefreq: "daily" as const,
      priority: 0.8,
    })),
    ...getPages().map((p) => ({ loc: absoluteUrl(`/${p.slug}`), lastmod: p.updated, changefreq: "monthly" as const, priority: 0.4 })),
    { loc: absoluteUrl("/faq"), changefreq: "monthly", priority: 0.4 },
    { loc: absoluteUrl("/contact"), changefreq: "monthly", priority: 0.4 },
    { loc: absoluteUrl("/sitemap"), lastmod: newest, changefreq: "weekly", priority: 0.3 },
  ];

  const productEntries: SitemapEntry[] = products.map((p) => ({
    loc: absoluteUrl(productPath(p)),
    lastmod: productDate(p),
    changefreq: "weekly",
    priority: p.is_live_animal ? 0.8 : 0.7,
    images: p.images.map((i) => absoluteUrl(i.url)),
  }));

  // Page 1 of the listing is /blog itself; the featured post is shown there.
  const listed = posts.length - (posts.length ? 1 : 0);
  const blog: SitemapEntry[] = [
    { loc: absoluteUrl("/blog"), lastmod: newestPost, changefreq: "weekly", priority: 0.7 },
    ...Array.from({ length: pageCount(listed) - 1 }, (_, i) => ({ loc: absoluteUrl(`/blog/page/${i + 2}`), lastmod: newestPost, changefreq: "weekly" as const, priority: 0.3 })),
    ...BLOG_CATEGORIES.filter((c) => getPostsByCategory(c.slug).length > 0).map((c) => ({
      loc: absoluteUrl(`/blog/category/${c.slug}`),
      lastmod: latest(getPostsByCategory(c.slug).map(lastModified)),
      changefreq: "weekly" as const,
      priority: c.slug === "care-guides" ? 0.7 : 0.5,
    })),
    ...posts.map((p) => ({ loc: absoluteUrl(postPath(p)), lastmod: lastModified(p), changefreq: "monthly" as const, priority: 0.6, images: [absoluteUrl(p.cover.src)] })),
  ];

  return { pages, products: productEntries, blog };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function urlsetXml(entries: SitemapEntry[]) {
  const urls = entries
    .map((e) =>
      [
        "  <url>",
        `    <loc>${esc(e.loc)}</loc>`,
        e.lastmod && `    <lastmod>${e.lastmod}</lastmod>`,
        e.changefreq && `    <changefreq>${e.changefreq}</changefreq>`,
        e.priority !== undefined && `    <priority>${e.priority.toFixed(1)}</priority>`,
        ...(e.images ?? []).map((src) => `    <image:image><image:loc>${esc(src)}</image:loc></image:image>`),
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
}

export function sitemapIndexXml(items: { loc: string; lastmod?: string }[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.map((i) => `  <sitemap>\n    <loc>${esc(i.loc)}</loc>${i.lastmod ? `\n    <lastmod>${i.lastmod}</lastmod>` : ""}\n  </sitemap>`).join("\n")}
</sitemapindex>
`;
}

export const xmlResponse = (xml: string) =>
  new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } });
