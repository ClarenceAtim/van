import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const DIR = path.join(process.cwd(), "content", "guides");

const frontmatter = z.object({
  title: z.string(),
  description: z.string().max(170),
  published: z.string(),
  updated: z.string().optional(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  species: z.array(z.string()).default([]),
  /** product slugs to recommend at the end of the guide */
  products: z.array(z.string()).default([]),
});

export type Guide = z.infer<typeof frontmatter> & { slug: string; body: string; readingMinutes: number };

export function getGuides(): Guide[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(DIR, f), "utf8"));
      const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d) : undefined);
      const meta = frontmatter.parse({ ...data, published: iso(data.published), updated: iso(data.updated) });
      return { ...meta, slug: f.replace(/\.md$/, ""), body: content, readingMinutes: Math.max(1, Math.round(content.split(/\s+/).length / 220)) };
    })
    .sort((a, b) => b.published.localeCompare(a.published));
}

export function getGuide(slug: string) {
  return getGuides().find((g) => g.slug === slug) ?? null;
}
