/**
 * Writes products from Supabase back to data/products/*.json so changes made in
 * /admin can be committed to GitHub (the source of truth).
 *
 *   npm run export:products
 *
 * Keeps each product's `image_search` hint from the existing JSON. Inactive
 * products are exported with "active": false. Every product is validated before
 * any file is written.
 */
import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import categories from "../data/categories.json";
import { PRODUCTS_DIR, productFiles } from "../src/lib/products/load";
import { productInputSchema, type ProductInput } from "../src/lib/products/schema";

loadEnv({ path: ".env.local" });
loadEnv();

const FIELDS = [
  "slug", "name", "category", "subcategory", "short_description", "long_description", "price_cents", "compare_at_price_cents",
  "currency", "stock_quantity", "sku", "images", "featured", "active", "is_live_animal", "species_scientific_name", "care_level",
  "adult_size", "lifespan", "diet", "temperature_range", "humidity_range", "tags", "seo_title", "seo_description", "image_search",
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db.from("products").select("*, product_images(*)").order("name");
  if (error) throw new Error(error.message);

  // Keep local image paths and search hints from the current files where the image is unchanged.
  const existing = new Map<string, ProductInput>();
  for (const f of productFiles()) for (const p of JSON.parse(fs.readFileSync(f, "utf8")) as ProductInput[]) existing.set(p.slug, p);
  const localName = (u: string) => path.basename(new URL(u, "http://x").pathname);

  const byCategory = new Map<string, ProductInput[]>(categories.map((c) => [c.slug, []]));
  const problems: string[] = [];
  for (const row of data ?? []) {
    const prev = existing.get(row.slug);
    const prevImages = new Map((prev?.images ?? []).map((i) => [localName(i.url), i]));
    const images = [...row.product_images]
      .sort((a, b) => a.position - b.position)
      .map((i) => {
        const local = prevImages.get(localName(i.url));
        return local ?? {
          url: i.url,
          ...(i.thumbnail_url ? { thumbnail_url: i.thumbnail_url } : {}),
          alt: i.alt,
          width: i.width,
          height: i.height,
          credit: i.credit,
          license: i.license,
          source_url: i.source_url,
          ...(i.placeholder ? { placeholder: true } : {}),
        };
      });
    const candidate = { ...row, images, image_search: prev?.image_search };
    const parsed = productInputSchema.safeParse(candidate);
    if (!parsed.success) {
      problems.push(`${row.slug}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      continue;
    }
    const ordered = Object.fromEntries(FIELDS.filter((k) => parsed.data[k] !== undefined).map((k) => [k, parsed.data[k]])) as ProductInput;
    byCategory.get(row.category)?.push(ordered);
  }
  if (problems.length) throw new Error(`Some products would not validate:\n  ${problems.join("\n  ")}`);

  for (const [category, list] of byCategory) {
    // Preserve the existing order of products in each file; new ones go at the end.
    const order = [...existing.values()].filter((p) => p.category === category).map((p) => p.slug);
    list.sort((a, b) => (order.indexOf(a.slug) + 1 || 1e9) - (order.indexOf(b.slug) + 1 || 1e9));
    fs.writeFileSync(path.join(PRODUCTS_DIR, `${category}.json`), JSON.stringify(list, null, 2) + "\n");
    console.log(`✔ ${category}.json (${list.length})`);
  }
  console.log("\nReview with `git diff data/products`, then commit and push.");
}

main().catch((e) => {
  console.error(`✖ ${(e as Error).message}`);
  process.exit(1);
});
