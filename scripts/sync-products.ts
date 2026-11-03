/**
 * Syncs data/products/*.json (the source of truth) into the Neon database.
 *
 *   npm run sync:products              # validate and upsert changed products
 *   npm run sync:products -- --dry-run # validate only (no network)
 *   npm run sync:products -- --prune   # also deactivate DB products that are not in the JSON files
 *
 * Product photos in public/products are served by the app's CDN (Vercel), so their
 * paths are stored as-is. Images uploaded in /admin live in Neon Object Storage.
 * Needs DATABASE_URL (from .env.local or the environment).
 */
import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import categories from "../data/categories.json";
import { replaceProductImages, upsertProduct, type ImageRow, type ProductRow } from "../src/lib/db/admin";
import { loadProductData, ProductValidationError } from "../src/lib/products/load";
import type { ProductInput } from "../src/lib/products/schema";

loadEnv({ path: ".env.local" });
loadEnv();

const PUBLIC_DIR = path.join(process.cwd(), "public");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const prune = args.has("--prune");

type Summary = { added: string[]; updated: string[]; skipped: string[]; deactivated: string[]; errors: string[] };

function toRow(p: ProductInput): ProductRow {
  const { images: _images, image_search: _hint, ...row } = p;
  return { ...row, compare_at_price_cents: row.compare_at_price_cents ?? null, subcategory: row.subcategory ?? null } as ProductRow;
}

function toImages(p: ProductInput): ImageRow[] {
  return p.images.map((i) => ({
    url: i.url,
    thumbnail_url: i.thumbnail_url ?? null,
    alt: i.alt,
    width: i.width,
    height: i.height,
    credit: i.credit,
    license: i.license,
    source_url: i.source_url,
    placeholder: i.placeholder ?? false,
    representative: i.representative ?? false,
  }));
}

/** Stable comparison of the fields we own, so unchanged products are skipped. */
const fingerprint = (row: object, images: ImageRow[]) => JSON.stringify([Object.entries(row).sort(([a], [b]) => a.localeCompare(b)), images]);

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

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✖ Set DATABASE_URL to sync (run `neon env pull`).");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  const summary: Summary = { added: [], updated: [], skipped: [], deactivated: [], errors: [] };

  try {
    // 1. Categories
    for (const c of categories) {
      await client.query(
        `insert into categories (slug, name, description, seo_title, seo_description, sort_order) values ($1, $2, $3, $4, $5, $6)
         on conflict (slug) do update set name = excluded.name, description = excluded.description, seo_title = excluded.seo_title,
           seo_description = excluded.seo_description, sort_order = excluded.sort_order`,
        [c.slug, c.name, c.description, c.seo_title, c.seo_description, c.sort_order],
      );
    }

    // 2. Current state, for skipping unchanged products
    const { rows: existing } = await client.query<{ slug: string; active: boolean; row: Record<string, unknown>; images: ImageRow[] }>(
      `select p.slug, p.active, to_jsonb(p) as row, coalesce((select jsonb_agg(jsonb_build_object(
          'url', i.url, 'thumbnail_url', i.thumbnail_url, 'alt', i.alt, 'width', i.width, 'height', i.height, 'credit', i.credit,
          'license', i.license, 'source_url', i.source_url, 'placeholder', i.placeholder, 'representative', i.representative) order by i.position)
        from product_images i where i.product_id = p.id), '[]'::jsonb) as images
       from products p`,
    );
    const bySlug = new Map(existing.map((r) => [r.slug, r]));

    // 3. Upsert products (each in its own transaction so one bad row doesn't block the rest)
    for (const p of products) {
      const row = toRow(p);
      const images = toImages(p);
      const current = bySlug.get(p.slug);
      if (current) {
        const currentRow = Object.fromEntries(Object.keys(row).map((k) => [k, current.row[k] ?? null]));
        if (fingerprint(currentRow, current.images) === fingerprint(row, images)) {
          summary.skipped.push(p.slug);
          continue;
        }
      }
      try {
        await client.query("begin");
        const id = await upsertProduct(client, row);
        await replaceProductImages(client, id, images);
        await client.query("commit");
        (current ? summary.updated : summary.added).push(p.slug);
      } catch (e) {
        await client.query("rollback");
        summary.errors.push(`${p.slug}: ${(e as Error).message}`);
      }
    }

    // 4. Optional prune: products in the DB but no longer in JSON are deactivated (never deleted: orders reference them).
    if (prune) {
      const slugs = new Set(products.map((p) => p.slug));
      const stale = existing.filter((r) => !slugs.has(r.slug) && r.active).map((r) => r.slug);
      if (stale.length) {
        await client.query("update products set active = false where slug = any($1::text[])", [stale]);
        summary.deactivated.push(...stale);
      }
    }
  } finally {
    await client.end();
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

  const list = (xs: string[]) => (xs.length > 10 ? `${xs.slice(0, 10).join(", ")}, …` : xs.join(", "));
  console.log(`
Sync summary
  added:       ${summary.added.length}${summary.added.length ? ` (${list(summary.added)})` : ""}
  updated:     ${summary.updated.length}${summary.updated.length ? ` (${list(summary.updated)})` : ""}
  skipped:     ${summary.skipped.length} unchanged
  deactivated: ${summary.deactivated.length}${summary.deactivated.length ? ` (${list(summary.deactivated)})` : ""}
  errors:      ${summary.errors.length}${summary.errors.map((e) => `\n    • ${e}`).join("")}`);
  if (summary.errors.length) process.exit(1);
}

main().catch((e) => {
  console.error(`✖ ${(e as Error).message}`);
  process.exit(1);
});
