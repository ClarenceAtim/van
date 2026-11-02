import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = path.join(process.cwd(), "content", "pages");

export type ContentPage = { slug: string; title: string; description: string; body: string; updated?: string };

const isoDay = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d) : undefined);

export function getPageSlugs() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
}

export function getPage(slug: string): ContentPage | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const file = path.join(DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  return { slug, title: String(data.title), description: String(data.description), body: content, updated: isoDay(data.updated) };
}

/** Every content page (about, policies…), for the sitemaps. */
export function getPages(): ContentPage[] {
  return getPageSlugs()
    .map(getPage)
    .filter((p): p is ContentPage => p !== null);
}
