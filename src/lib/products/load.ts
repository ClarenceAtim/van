import fs from "node:fs";
import path from "node:path";
import { parseProductData } from "./parse";
import type { ProductInput } from "./schema";

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
  const files: { name: string; raw: unknown }[] = [];
  const problems: string[] = [];
  for (const file of productFiles(dir)) {
    const name = path.basename(file);
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      problems.push(`${name}: not valid JSON (${(e as Error).message})`);
      continue;
    }
    files.push({ name, raw });
  }
  const { products, problems: allProblems } = parseProductData(files, problems);
  if (allProblems.length) throw new ProductValidationError(allProblems);
  return products;
}
