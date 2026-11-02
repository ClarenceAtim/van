import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const DIR = path.join(process.cwd(), "content", "blog");

export const BLOG_CATEGORIES = [
  { slug: "care-guides", name: "Care Guides", description: "Complete husbandry guides for popular pet reptiles: enclosure, heat, humidity, lighting and diet." },
  { slug: "species-profiles", name: "Species Profiles", description: "Get to know individual reptile species, from temperament and adult size to how much care they really need." },
  { slug: "habitat-setup", name: "Habitat & Setup", description: "Build the right enclosure: bioactive terrariums, UVB lighting, heating, thermostats and humidity." },
  { slug: "feeding-nutrition", name: "Feeding & Nutrition", description: "What reptiles eat, how often to feed, feeder insects and rodents, and how to use calcium and vitamin supplements." },
  { slug: "health-wellness", name: "Health & Wellness", description: "Recognize a healthy reptile, spot early signs of illness and know when it's time to see a reptile vet." },
  { slug: "beginner-tips", name: "Beginner Tips", description: "Practical advice for first-time keepers: choosing a reptile, preparing your home and the first weeks together." },
  { slug: "shop-news", name: "Shop News", description: "New arrivals, restocks and updates from ScaleHaven Reptiles." },
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];
const CATEGORY_SLUGS = BLOG_CATEGORIES.map((c) => c.slug) as [BlogCategory["slug"], ...BlogCategory["slug"][]];

export const POSTS_PER_PAGE = 9;

const isoDate = z.preprocess((d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD"));

export const postFrontmatter = z.object({
  title: z.string().min(10).max(110),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, numbers and single hyphens"),
  description: z.string().min(70).max(170),
  category: z.enum(CATEGORY_SLUGS),
  tags: z.array(z.string()).default([]),
  author: z.string(),
  date: isoDate,
  updated: isoDate.optional(),
  cover: z.object({
    src: z.string().startsWith("/"),
    alt: z.string().min(10),
    credit: z.string().min(1),
    license: z.string().min(1),
    source_url: z.union([z.url(), z.literal("")]),
  }),
  featured: z.boolean().default(false),
  /** Product slugs shown as "Shop the products in this guide". */
  related_products: z.array(z.string()).default([]),
  /** Scientific names this post covers; live-animal product pages link here. */
  species: z.array(z.string()).default([]),
});

export type Heading = { depth: 2 | 3; text: string; id: string };
export type Faq = { question: string; answer: string };
export type Post = z.infer<typeof postFrontmatter> & {
  body: string;
  readingMinutes: number;
  headings: Heading[];
  faqs: Faq[];
};

const authorSchema = z.record(
  z.string(),
  z.object({ name: z.string(), role: z.string(), bio: z.string(), type: z.enum(["Person", "Organization"]).default("Person") }),
);
export type Author = z.infer<typeof authorSchema>[string] & { id: string };

/** Markdown inline syntax → plain text (for headings and FAQ answers). */
export const plainText = (md: string) =>
  md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** "Heat & light" → "heat-light". Shared by the table of contents and the rendered headings. */
export const headingId = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Headings outside fenced code blocks. */
function extractHeadings(body: string): Heading[] {
  const out: Heading[] = [];
  let inCode = false;
  for (const line of body.split("\n")) {
    if (line.startsWith("```")) inCode = !inCode;
    const m = !inCode && /^(##|###) (.+)$/.exec(line.trim());
    if (m) {
      const text = plainText(m[2]);
      out.push({ depth: m[1].length as 2 | 3, text, id: headingId(text) });
    }
  }
  return out;
}

/** "## Frequently asked questions" section: each "### Question" followed by its answer. */
function extractFaqs(body: string): Faq[] {
  const section = /^## Frequently asked questions\s*$([\s\S]*?)(?=^## |(?![\s\S]))/im.exec(body)?.[1] ?? "";
  return section
    .split(/^### /m)
    .slice(1)
    .map((block) => {
      const [q, ...rest] = block.split("\n");
      return { question: plainText(q), answer: plainText(rest.join(" ").replace(/<[^>]+>/g, "")) };
    })
    .filter((f) => f.question && f.answer);
}

let cache: Post[] | null = null;

export function getPosts(): Post[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  if (!fs.existsSync(DIR)) return [];
  cache = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(DIR, f), "utf8"));
      const parsed = postFrontmatter.safeParse(data);
      if (!parsed.success) throw new Error(`content/blog/${f}: ${z.prettifyError(parsed.error)}`);
      if (parsed.data.slug !== f.replace(/\.mdx$/, "")) throw new Error(`content/blog/${f}: slug "${parsed.data.slug}" must match the file name`);
      return {
        ...parsed.data,
        body: content,
        readingMinutes: Math.max(1, Math.round(content.split(/\s+/).length / 230)),
        headings: extractHeadings(content),
        faqs: extractFaqs(content),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  return cache;
}

export const getPost = (slug: string) => getPosts().find((p) => p.slug === slug) ?? null;
export const getCategoryInfo = (slug: string) => BLOG_CATEGORIES.find((c) => c.slug === slug) ?? null;
export const getPostsByCategory = (slug: string) => getPosts().filter((p) => p.category === slug);
export const postPath = (p: { slug: string }) => `/blog/${p.slug}`;
export const lastModified = (p: Post) => p.updated ?? p.date;
export const pageCount = (count = getPosts().length) => Math.max(1, Math.ceil(count / POSTS_PER_PAGE));

/** Posts sharing the category or tags, best match first. */
export function getRelatedPosts(post: Post, limit = 3): Post[] {
  const tags = new Set(post.tags);
  return getPosts()
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, score: (p.category === post.category ? 2 : 0) + p.tags.filter((t) => tags.has(t)).length }))
    .sort((a, b) => b.score - a.score || b.p.date.localeCompare(a.p.date))
    .slice(0, limit)
    .map((x) => x.p);
}

/** The care guide for a species (used on live-animal product pages). */
export const getCareGuideForSpecies = (scientificName: string | null | undefined) =>
  scientificName ? getPosts().find((p) => p.species.some((s) => scientificName === s || scientificName.startsWith(`${s} `))) ?? null : null;

export function getAuthor(id: string): Author {
  const file = path.join(DIR, "_authors.json");
  const authors = fs.existsSync(file) ? authorSchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))) : {};
  return { id, ...(authors[id] ?? { name: id, role: "", bio: "", type: "Person" as const }) };
}
