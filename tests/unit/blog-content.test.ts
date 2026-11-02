import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPosts } from "@/lib/blog";
import { loadProductData } from "@/lib/products/load";

const posts = getPosts();
const products = loadProductData();
const productPaths = new Set(products.map((p) => `/shop/${p.category}/${p.slug}`));
const productSlugs = new Set(products.map((p) => p.slug));
const postPaths = new Set(posts.map((p) => `/blog/${p.slug}`));
const links = (body: string) => [...body.matchAll(/\]\((\/[^)#\s]+)/g)].map((m) => m[1]);

describe("blog posts (content/blog/*.mdx)", () => {
  it("loads posts with valid frontmatter and unique slugs", () => {
    expect(posts.length).toBeGreaterThanOrEqual(15);
    expect(new Set(posts.map((p) => p.slug)).size).toBe(posts.length);
    expect(new Set(posts.map((p) => p.title)).size).toBe(posts.length);
  });

  it.each(posts.map((p) => [p.slug, p] as const))("%s: related products exist", (_, post) => {
    for (const slug of post.related_products) expect(productSlugs, `unknown product "${slug}"`).toContain(slug);
  });

  it.each(posts.map((p) => [p.slug, p] as const))("%s: links to at least 2 products and 1 other post, all valid", (_, post) => {
    const internal = links(post.body);
    const toProducts = internal.filter((l) => l.startsWith("/shop/"));
    const toPosts = internal.filter((l) => l.startsWith("/blog/") && l !== `/blog/${post.slug}`);
    expect(new Set(toProducts).size).toBeGreaterThanOrEqual(2);
    expect(new Set(toPosts).size).toBeGreaterThanOrEqual(1);
    for (const l of toProducts) expect(productPaths, `broken product link ${l}`).toContain(l);
    for (const l of toPosts) expect(postPaths, `broken post link ${l}`).toContain(l);
  });

  it.each(posts.map((p) => [p.slug, p] as const))("%s: has a 3–5 question FAQ, no H1 and a cover image", (_, post) => {
    expect(post.faqs.length).toBeGreaterThanOrEqual(3);
    expect(post.faqs.length).toBeLessThanOrEqual(5);
    expect(post.body).not.toMatch(/^# /m);
    expect(fs.existsSync(path.join("public", post.cover.src))).toBe(true);
  });
});
