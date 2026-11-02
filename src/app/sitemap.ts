import type { MetadataRoute } from "next";
import { getAllProducts, getCategories } from "@/lib/catalog";
import { productPath } from "@/lib/format";
import { getPosts, lastModified, postPath } from "@/lib/blog";
import { getPageSlugs } from "@/lib/pages";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getAllProducts(), getCategories()]);
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: absoluteUrl(`/shop/${c.slug}`), lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({
      url: absoluteUrl(productPath(p)),
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: p.is_live_animal ? 0.8 : 0.7,
      images: p.images.map((i) => absoluteUrl(i.url)),
    })),
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...getPosts().map((p) => ({ url: absoluteUrl(postPath(p)), lastModified: new Date(lastModified(p)), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...["faq", "contact", "credits", ...getPageSlugs()].map((slug) => ({ url: absoluteUrl(`/${slug}`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}
