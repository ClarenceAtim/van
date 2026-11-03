/**
 * Re-compresses product and blog photos that are over budget, keeping their file names.
 *
 *   npx tsx scripts/compress-images.ts            # report only
 *   npx tsx scripts/compress-images.ts --write    # re-encode files over budget
 *
 * Budgets: full-size photos ≤ 150 KB, thumbnails (-thumb.webp) ≤ 40 KB. Quality is stepped
 * down first; only if that isn't enough is the image narrowed (never below 800 px / 420 px).
 * Product JSON width/height are updated when an image is resized.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { productFiles } from "../src/lib/products/load";
import type { ProductInput } from "../src/lib/products/schema";

const write = process.argv.includes("--write");
const KB = 1024;
const DIRS = ["public/products", "public/blog"];

type Plan = { budget: number; qualities: number[]; widths: number[] };
const FULL: Plan = { budget: 150 * KB, qualities: [76, 70, 64, 58, 52, 46], widths: [1600, 1400, 1200, 1000, 900, 800] };
const THUMB: Plan = { budget: 40 * KB, qualities: [72, 64, 56, 50, 44], widths: [600, 540, 480, 420] };

async function shrink(file: string, plan: Plan) {
  const input = fs.readFileSync(file);
  const meta = await sharp(input).metadata();
  for (const width of plan.widths.filter((w) => w <= (meta.width ?? w))) {
    for (const quality of plan.qualities) {
      const out = await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 6 }).toBuffer({ resolveWithObject: true });
      if (out.data.length <= plan.budget) return out;
    }
  }
  return null;
}

async function main() {
  const resized = new Map<string, { width: number; height: number }>();
  let over = 0, fixed = 0, saved = 0;
  for (const dir of DIRS) {
    for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".webp"))) {
      const file = path.join(dir, name);
      const size = fs.statSync(file).size;
      const plan = name.endsWith("-thumb.webp") ? THUMB : FULL;
      if (size <= plan.budget) continue;
      over++;
      const out = await shrink(file, plan);
      if (!out) {
        console.warn(`! ${file}: still over budget at the smallest setting (${Math.round(size / KB)} KB)`);
        continue;
      }
      console.log(`${write ? "✔" : "•"} ${file}: ${Math.round(size / KB)} KB → ${Math.round(out.data.length / KB)} KB (${out.info.width}×${out.info.height})`);
      if (!write) continue;
      fs.writeFileSync(file, out.data);
      fixed++;
      saved += size - out.data.length;
      resized.set(`/${path.relative("public", file).replace(/\\/g, "/")}`, { width: out.info.width, height: out.info.height });
    }
  }
  if (write) {
    // Keep stored dimensions in sync with the files.
    for (const file of productFiles()) {
      const products = JSON.parse(fs.readFileSync(file, "utf8")) as ProductInput[];
      let changed = false;
      for (const img of products.flatMap((p) => p.images)) {
        const dims = resized.get(img.url);
        if (dims && (dims.width !== img.width || dims.height !== img.height)) {
          Object.assign(img, dims);
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(file, JSON.stringify(products, null, 2) + "\n");
    }
  }
  console.log(`\n${over} over budget${write ? `, ${fixed} re-encoded, ${Math.round(saved / KB / KB)} MB saved` : " (run with --write to fix)"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
