/**
 * Replaces a product's image with your own photo.
 *
 *   npx tsx scripts/use-own-photo.ts <slug> <path-to-photo> "Alt text" ["Credit"]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { productFiles } from "../src/lib/products/load";
import type { ProductInput } from "../src/lib/products/schema";

const [slug, photo, alt, credit = "ScaleHaven Reptiles"] = process.argv.slice(2);
if (!slug || !photo || !alt) {
  console.error('Usage: npx tsx scripts/use-own-photo.ts <slug> <photo> "Alt text" ["Credit"]');
  process.exit(1);
}

async function main() {
  const file = productFiles().find((f) => (JSON.parse(fs.readFileSync(f, "utf8")) as ProductInput[]).some((p) => p.slug === slug));
  if (!file) throw new Error(`No product with slug "${slug}"`);
  const meta = await sharp(photo).metadata();
  if ((meta.width ?? 0) < 1200) console.warn(`! Photo is only ${meta.width}px wide; 1200px or more looks best.`);

  const out = path.join(process.cwd(), "public", "products");
  const full = await sharp(photo).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  fs.writeFileSync(path.join(out, `${slug}-1.webp`), full.data);
  await sharp(full.data).resize({ width: 600 }).webp({ quality: 75 }).toFile(path.join(out, `${slug}-1-thumb.webp`));
  for (const stale of [`${slug}-1.svg`]) fs.rmSync(path.join(out, stale), { force: true });
  if (path.resolve(photo).startsWith(out) && !photo.endsWith(".webp")) fs.rmSync(photo);

  const products = JSON.parse(fs.readFileSync(file, "utf8")) as ProductInput[];
  const product = products.find((p) => p.slug === slug)!;
  product.images = [
    {
      url: `/products/${slug}-1.webp`,
      thumbnail_url: `/products/${slug}-1-thumb.webp`,
      alt,
      width: full.info.width,
      height: full.info.height,
      credit,
      license: "Own work",
      source_url: "",
    },
  ];
  fs.writeFileSync(file, JSON.stringify(products, null, 2) + "\n");
  console.log(`✔ Updated ${slug} (${full.info.width}×${full.info.height}). Commit and push to publish.`);
}

main().catch((e) => {
  console.error(`✖ ${(e as Error).message}`);
  process.exit(1);
});
