/**
 * Finds a commercially-usable photo for every product, optimizes it and records
 * credit/license data in data/products/*.json.
 *
 *   npm run fetch:images                      # products that have no image yet
 *   npm run fetch:images -- --only a,b        # just these slugs (replaces their images)
 *   npm run fetch:images -- --skip-file 3     # with --only: skip the first 3 candidates (try the next photo)
 *   npm run fetch:images -- --placeholder a,b # force a generated illustration for these slugs
 *
 * Sources, in order: Unsplash (UNSPLASH_ACCESS_KEY), Pexels (PEXELS_API_KEY),
 * Wikimedia Commons (CC0 / Public Domain / CC BY / CC BY-SA only).
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { productFiles } from "../src/lib/products/load";
import type { ProductImage, ProductInput } from "../src/lib/products/schema";
import { placeholderSvg } from "./lib/placeholder-svg";

loadEnv({ path: ".env.local" });

const args = process.argv.slice(2);
const argValue = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const representative = new Set(argValue("--representative")?.split(",").filter(Boolean));

const OUT_DIR = path.join(process.cwd(), "public", "products");
const UA = "ScaleHavenReptiles-ImageFetcher/1.0 (https://github.com/ClarenceAtim/van)";
const MIN_WIDTH = Number(argValue("--min-width") ?? 900);
const MAX_WIDTH = 1600;
const THUMB_WIDTH = 600;

const only = new Set(argValue("--only")?.split(",").filter(Boolean));
const forcePlaceholder = new Set(argValue("--placeholder")?.split(",").filter(Boolean));
const skip = Number(argValue("--skip-file") ?? 0);

type Candidate = {
  downloadUrl: string;
  width: number;
  height: number;
  credit: string;
  license: string;
  sourceUrl: string;
  title: string;
  onUse?: () => Promise<void>;
};

const BAD_TITLE = /(skeleton|skull|museum|specimen|map|drawing|illustration|diagram|stamp|logo|dead|roadkill|preserved|x-ray|distribution|range|bone|fossil|painting|engraving|svg|plate|book scan|frieze|relief|sculpture|carving|limestone|vase|statue|coin)/i;
const OK_LICENSE = /^(cc0|cc-zero|public domain|pd\b|pd-|cc by(-sa)? \d|cc-by(-sa)?-\d)/i;
const BAD_LICENSE = /(nc|nd|non-?commercial|no-?deriv)/i;

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, " ").trim();

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return (await res.json()) as T;
  }
  throw new Error(`Rate limited: ${url}`);
}

async function unsplash(query: string): Promise<Candidate[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  type R = { results: { width: number; height: number; urls: { raw: string }; links: { html: string; download_location: string }; user: { name: string }; alt_description: string | null }[] };
  const data = await getJson<R>(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape&content_filter=high`,
    { Authorization: `Client-ID ${key}` },
  );
  return data.results.map((r) => ({
    downloadUrl: `${r.urls.raw}&w=${MAX_WIDTH}&fm=jpg&q=85`,
    width: r.width,
    height: r.height,
    credit: `${r.user.name} on Unsplash`,
    license: "Unsplash License",
    sourceUrl: r.links.html,
    title: r.alt_description ?? "",
    // Unsplash API guidelines require triggering the download endpoint when a photo is used.
    onUse: async () => void (await fetch(r.links.download_location, { headers: { Authorization: `Client-ID ${key}` } })),
  }));
}

async function pexels(query: string): Promise<Candidate[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  type R = { photos: { width: number; height: number; url: string; photographer: string; alt: string; src: { original: string } }[] };
  const data = await getJson<R>(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`, {
    Authorization: key,
  });
  return data.photos.map((p) => ({
    downloadUrl: `${p.src.original}?auto=compress&w=${MAX_WIDTH}`,
    width: p.width,
    height: p.height,
    credit: `${p.photographer} on Pexels`,
    license: "Pexels License",
    sourceUrl: p.url,
    title: p.alt,
  }));
}

async function wikimedia(query: string): Promise<Candidate[]> {
  type Info = {
    width: number; height: number; mime: string; thumburl?: string; url: string; descriptionurl: string;
    extmetadata?: Record<string, { value: string }>;
  };
  type R = { query?: { pages: Record<string, { title: string; index: number; imageinfo?: Info[] }> } };
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=30" +
    `&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}` +
    `&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=${MAX_WIDTH}` +
    "&iiextmetadatafilter=LicenseShortName|Artist|Credit";
  const data = await getJson<R>(url);
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  const out: Candidate[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const license = info.extmetadata?.LicenseShortName?.value ?? "";
    if (!OK_LICENSE.test(license) || BAD_LICENSE.test(license)) continue;
    if (!/image\/(jpeg|png)/.test(info.mime)) continue;
    const artist = stripHtml(info.extmetadata?.Artist?.value ?? "") || "Unknown author";
    out.push({
      downloadUrl: info.thumburl ?? info.url,
      width: info.width,
      height: info.height,
      credit: `${artist.slice(0, 120)} via Wikimedia Commons`,
      license,
      sourceUrl: info.descriptionurl,
      title: page.title,
    });
  }
  return out;
}

function acceptable(c: Candidate) {
  const ratio = c.width / c.height;
  return c.width >= MIN_WIDTH && ratio >= 0.75 && ratio <= 2.4 && !BAD_TITLE.test(c.title);
}

async function findCandidates(query: string) {
  const found: Candidate[] = [];
  for (const source of [unsplash, pexels, wikimedia]) {
    try {
      found.push(...(await source(query)).filter(acceptable));
    } catch (e) {
      console.warn(`  ! ${source.name} failed: ${(e as Error).message}`);
    }
  }
  return found;
}

async function savePhoto(slug: string, c: Candidate, alt: string): Promise<ProductImage> {
  const res = await fetch(c.downloadUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  return writeVariants(slug, input, { alt, credit: c.credit, license: c.license, source_url: c.sourceUrl });
}

async function writeVariants(slug: string, input: Buffer, meta: Pick<ProductImage, "alt" | "credit" | "license" | "source_url"> & { placeholder?: boolean }) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const base = `${slug}-1`;
  const full = await sharp(input).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  fs.writeFileSync(path.join(OUT_DIR, `${base}.webp`), full.data);
  await sharp(full.data).resize({ width: THUMB_WIDTH }).webp({ quality: 75 }).toFile(path.join(OUT_DIR, `${base}-thumb.webp`));
  return {
    url: `/products/${base}.webp`,
    thumbnail_url: `/products/${base}-thumb.webp`,
    width: full.info.width,
    height: full.info.height,
    ...meta,
  };
}

async function savePlaceholder(p: ProductInput): Promise<ProductImage> {
  const svg = placeholderSvg(p);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${p.slug}-1.svg`), svg);
  return writeVariants(p.slug, Buffer.from(svg), {
    alt: `Illustration of ${p.name}`,
    credit: "ScaleHaven Reptiles (placeholder illustration)",
    license: "Own work",
    source_url: "",
    placeholder: true,
  });
}

async function main() {
  const report: { slug: string; result: string }[] = [];
  for (const file of productFiles()) {
    const products = JSON.parse(fs.readFileSync(file, "utf8")) as ProductInput[];
    let changed = false;
    for (const p of products) {
      const targeted = only.has(p.slug) || forcePlaceholder.has(p.slug);
      if (only.size || forcePlaceholder.size ? !targeted : p.images.length > 0) continue;

      process.stdout.write(`• ${p.slug} … `);
      let image: ProductImage | null = null;
      if (!forcePlaceholder.has(p.slug)) {
        const query = p.image_search?.query ?? p.name;
        const candidates = (await findCandidates(query)).slice(skip);
        for (const c of candidates) {
          try {
            image = await savePhoto(p.slug, c, p.image_search?.alt ?? p.name);
            if (representative.has(p.slug)) image.representative = true;
            await c.onUse?.();
            console.log(`photo: ${c.title} (${c.license})`);
            report.push({ slug: p.slug, result: `photo ${c.sourceUrl}` });
            break;
          } catch (e) {
            console.warn(`  ! ${(e as Error).message}`);
          }
        }
      }
      if (!image) {
        image = await savePlaceholder(p);
        console.log("placeholder illustration");
        report.push({ slug: p.slug, result: "placeholder" });
      }
      p.images = [image];
      changed = true;
      await new Promise((r) => setTimeout(r, 300)); // be polite to the APIs
    }
    if (changed) fs.writeFileSync(file, JSON.stringify(products, null, 2) + "\n");
  }
  const placeholders = report.filter((r) => r.result === "placeholder").length;
  console.log(`\nDone: ${report.length - placeholders} photos, ${placeholders} placeholders.`);
  writeImagesTodo();
}

/** Lists products whose image is an illustration or a representative photo in docs/IMAGES-TODO.md. */
function writeImagesTodo() {
  const rows: string[] = [];
  for (const file of productFiles()) {
    for (const p of JSON.parse(fs.readFileSync(file, "utf8")) as ProductInput[]) {
      const img = p.images[0];
      if (!img || img.placeholder || img.representative) {
        const kind = !img || img.placeholder ? "Illustration" : "Representative photo";
        const priority = p.is_live_animal ? "**High**" : img?.placeholder ? "Medium" : "Low";
        rows.push(`| ${priority} | ${kind} | ${p.category} | \`${p.slug}\` | ${p.name} | ${img?.alt ?? ""} |`);
      }
    }
  }
  const md = `# Images to replace

Every product has an image, but these don't show the exact item you sell:

- **Representative photo** — a real, licensed photo of the same species or the same type of item (e.g. a generic thermostat, or the normal form of a morph). The product page labels it "Representative photo".
- **Illustration** — a generated drawing used when no suitable photo was found.

Replace them with your own or supplier photos — see [ADDING-PRODUCTS.md](ADDING-PRODUCTS.md#replacing-a-product-photo).
Live animals are **High** priority: buyers expect to see the actual animal or morph.

_${rows.length} products · regenerated by \`npm run fetch:images\`_

| Priority | Image | Category | Slug | Product | Current photo shows |
| --- | --- | --- | --- | --- | --- |
${rows.sort().join("\n")}
`;
  fs.writeFileSync(path.join(process.cwd(), "docs", "IMAGES-TODO.md"), md);
  console.log(`Updated docs/IMAGES-TODO.md (${rows.length} to replace)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
