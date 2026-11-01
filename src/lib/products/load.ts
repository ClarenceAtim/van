import fs from "node:fs";
import path from "node:path";
import { productFileSchema, type ProductInput } from "./schema";

export const PRODUCTS_DIR = path.join(process.cwd(), "data", "products");

export class ProductValidationError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Product data is invalid:\n${problems.map((p) => `  • ${p}`).join("\n")}`);
  }
}

export function productFiles(dir = PRODUCTS_DIR) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => path.join(dir, f));
}

/** Reads and validates every data/products/*.json file. Throws ProductValidationError with readable messages. */
export function loadProductData(dir = PRODUCTS_DIR): ProductInput[] {
  const problems: string[] = [];
  const all: ProductInput[] = [];
  const seenSlugs = new Map<string, string>();
  const seenSkus = new Map<string, string>();

  for (const file of productFiles(dir)) {
    const name = path.basename(file);
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      problems.push(`${name}: not valid JSON (${(e as Error).message})`);
      continue;
    }
    const parsed = productFileSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const [index, ...rest] = issue.path;
        const slug = typeof index === "number" ? (raw as { slug?: string }[])[index]?.slug : undefined;
        problems.push(`${name} → product #${String(index)}${slug ? ` (${slug})` : ""} → ${rest.join(".") || "(root)"}: ${issue.message}`);
      }
      continue;
    }
    for (const p of parsed.data) {
      const prevSlug = seenSlugs.get(p.slug);
      if (prevSlug) problems.push(`${name}: duplicate slug "${p.slug}" (also in ${prevSlug})`);
      const prevSku = seenSkus.get(p.sku);
      if (prevSku) problems.push(`${name}: duplicate sku "${p.sku}" (also in ${prevSku})`);
      seenSlugs.set(p.slug, name);
      seenSkus.set(p.sku, name);
      all.push(p);
    }
  }
  if (problems.length) throw new ProductValidationError(problems);
  return all;
}
