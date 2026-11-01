/**
 * Syncs data/products/*.json (the source of truth) into Supabase.
 *
 *   npm run sync:products              # validate, upload new images, upsert products
 *   npm run sync:products -- --dry-run # validate only (no network)
 *   npm run sync:products -- --prune   # also deactivate DB products that are not in the JSON files
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from .env.local or the environment).
 */
import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import categories from "../data/categories.json";
import { loadProductData, ProductValidationError } from "../src/lib/products/load";
import type { ProductImage, ProductInput } from "../src/lib/products/schema";

loadEnv({ path: ".env.local" });
loadEnv();

const BUCKET = "products";
const PUBLIC_DIR = path.join(process.cwd(), "public");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const prune = args.has("--prune");

const CONTENT_TYPES: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };

type Summary = { added: string[]; updated: string[]; skipped: string[]; deactivated: string[]; uploaded: number; errors: string[] };

function toRow(p: ProductInput) {
  const { images, image_search, ...row } = p;
  return { ...row, compare_at_price_cents: row.compare_at_price_cents ?? null, subcategory: row.subcategory ?? null };
}

/** Stable comparison of the fields we own, so unchanged products are skipped. */
function fingerprint(row: Record<string, unknown>, images: Pick<ProductImage, "url" | "alt" | "credit" | "license">[]) {
  const keys = Object.keys(row).sort();
  return JSON.stringify([keys.map((k) => [k, row[k] ?? null]), images.map((i) => [i.url, i.alt, i.credit, i.license])]);
}

async function main() {
  let products: ProductInput[];
  try {
    products = loadProductData();
  } catch (e) {
    if (e instanceof ProductValidationError) {
      console.error(`✖ ${e.message}`);
      process.exit(1);
    }
    throw e;
  }
  console.log(`✔ ${products.length} products valid across ${new Set(products.map((p) => p.category)).size} categories`);

  // Check that every local image exists before touching the database.
  const missing = products.flatMap((p) =>
    p.images.flatMap((i) => [i.url, i.thumbnail_url].filter((u): u is string => !!u && u.startsWith("/") && !fs.existsSync(path.join(PUBLIC_DIR, u)))),
  );
  if (missing.length) {
    console.error(`✖ Missing image files:\n${missing.map((m) => `  • public${m}`).join("\n")}`);
    process.exit(1);
  }
  if (dryRun) {
    console.log("Dry run: no changes made.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("✖ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to sync.");
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const summary: Summary = { added: [], updated: [], skipped: [], deactivated: [], uploaded: 0, errors: [] };

  // 1. Categories
  const { error: catError } = await db.from("categories").upsert(categories, { onConflict: "slug" });
  if (catError) throw new Error(`categories: ${catError.message}`);

  // 2. Images → Storage (only new or changed files)
  const { data: existingFiles, error: listError } = await db.storage.from(BUCKET).list("", { limit: 10000 });
  if (listError) throw new Error(`storage list: ${listError.message}`);
  const remoteSizes = new Map(existingFiles.map((f) => [f.name, (f.metadata as { size?: number } | null)?.size]));
  const publicUrl = (file: string) => db.storage.from(BUCKET).getPublicUrl(file).data.publicUrl;

  async function upload(localUrl: string) {
    if (!localUrl.startsWith("/")) return localUrl; // already remote
    const file = path.basename(localUrl);
    const buf = fs.readFileSync(path.join(PUBLIC_DIR, localUrl));
    if (remoteSizes.get(file) !== buf.length) {
      const { error } = await db.storage.from(BUCKET).upload(file, buf, {
        upsert: true,
        contentType: CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
        cacheControl: "31536000",
      });
      if (error) throw new Error(`upload ${file}: ${error.message}`);
      summary.uploaded++;
    }
    return publicUrl(file);
  }

  // 3. Products
  const { data: existing, error: exError } = await db.from("products").select("*, product_images(url, alt, credit, license, position)");
  if (exError) throw new Error(`products: ${exError.message}`);
  type Existing = Record<string, unknown> & { id: string; slug: string; product_images: (ProductImage & { position: number })[] };
  const bySlug = new Map((existing as Existing[]).map((r) => [r.slug, r]));

  for (const p of products) {
    try {
      const images = [];
      for (const img of p.images) {
        images.push({ ...img, url: await upload(img.url), thumbnail_url: img.thumbnail_url ? await upload(img.thumbnail_url) : null });
      }
      const row = toRow(p);
      const current = bySlug.get(p.slug);
      if (current) {
        const currentRow = Object.fromEntries(Object.keys(row).map((k) => [k, current[k]]));
        const currentImages = [...current.product_images].sort((a, b) => a.position - b.position);
        if (fingerprint(currentRow, currentImages) === fingerprint(row, images)) {
          summary.skipped.push(p.slug);
          continue;
        }
      }
      const { data: saved, error } = await db.from("products").upsert(row, { onConflict: "slug" }).select("id").single();
      if (error) throw new Error(error.message);
      await db.from("product_images").delete().eq("product_id", saved.id);
      if (images.length) {
        const { error: imgError } = await db.from("product_images").insert(
          images.map((img, position) => ({
            product_id: saved.id,
            url: img.url,
            thumbnail_url: img.thumbnail_url,
            alt: img.alt,
            width: img.width,
            height: img.height,
            credit: img.credit,
            license: img.license,
            source_url: img.source_url,
            placeholder: img.placeholder ?? false,
            position,
          })),
        );
        if (imgError) throw new Error(`images: ${imgError.message}`);
      }
      (current ? summary.updated : summary.added).push(p.slug);
    } catch (e) {
      summary.errors.push(`${p.slug}: ${(e as Error).message}`);
    }
  }

  // 4. Optional prune: products in the DB but no longer in JSON are deactivated (never deleted: orders reference them).
  if (prune) {
    const slugs = new Set(products.map((p) => p.slug));
    const stale = (existing as Existing[]).filter((r) => !slugs.has(r.slug) && r.active).map((r) => r.slug);
    if (stale.length) {
      const { error } = await db.from("products").update({ active: false }).in("slug", stale);
      if (error) summary.errors.push(`prune: ${error.message}`);
      else summary.deactivated.push(...stale);
    }
  }

  // 5. Tell the live site to refresh its cached pages.
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (site && secret && (summary.added.length || summary.updated.length || summary.deactivated.length)) {
    try {
      const res = await fetch(`${site.replace(/\/$/, "")}/api/revalidate`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
      console.log(res.ok ? `✔ Revalidated ${site}` : `! Revalidate returned ${res.status}`);
    } catch (e) {
      console.warn(`! Could not reach ${site} to revalidate: ${(e as Error).message}`);
    }
  }

  console.log(`
Sync summary
  added:       ${summary.added.length}${summary.added.length ? ` (${summary.added.join(", ")})` : ""}
  updated:     ${summary.updated.length}${summary.updated.length ? ` (${summary.updated.join(", ")})` : ""}
  skipped:     ${summary.skipped.length} unchanged
  deactivated: ${summary.deactivated.length}${summary.deactivated.length ? ` (${summary.deactivated.join(", ")})` : ""}
  images uploaded: ${summary.uploaded}
  errors:      ${summary.errors.length}${summary.errors.map((e) => `\n    • ${e}`).join("")}`);
  if (summary.errors.length) process.exit(1);
}

main().catch((e) => {
  console.error(`✖ ${(e as Error).message}`);
  process.exit(1);
});
