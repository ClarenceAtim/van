import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadProductData } from "@/lib/products/load";
import { productInputSchema } from "@/lib/products/schema";

const products = loadProductData();

describe("product catalog data", () => {
  it("has at least 100 valid products", () => {
    expect(products.length).toBeGreaterThanOrEqual(100);
  });

  it("covers every category", () => {
    const counts = Object.groupBy(products, (p) => p.category);
    expect(Object.keys(counts).sort()).toEqual(
      ["care-accessories", "enclosures", "food-supplements", "heating-lighting", "live-reptiles", "substrate-decor"].sort(),
    );
    expect(counts["live-reptiles"]!.length).toBeGreaterThanOrEqual(40);
  });

  it("has unique descriptions", () => {
    const shorts = new Set(products.map((p) => p.short_description));
    const longs = new Set(products.map((p) => p.long_description));
    expect(shorts.size).toBe(products.length);
    expect(longs.size).toBe(products.length);
  });

  it("gives every product an image, or lists it in docs/IMAGES-TODO.md until a real photo exists", () => {
    const todo = fs.readFileSync(path.join(process.cwd(), "docs", "IMAGES-TODO.md"), "utf8");
    const untracked = products.filter((p) => p.images.length === 0 && !todo.includes(`\`${p.slug}\``)).map((p) => p.slug);
    expect(untracked).toEqual([]);
  });

  it("never uses SVG, icon or illustration placeholders as product images", () => {
    const placeholders = products.flatMap((p) => p.images.filter((i) => i.placeholder || /\.svg$/i.test(i.url)).map(() => p.slug));
    expect(placeholders).toEqual([]);
  });
});

describe("product schema", () => {
  const base = products.find((p) => p.is_live_animal)!;

  it("rejects live animals without care data", () => {
    const r = productInputSchema.safeParse({ ...base, temperature_range: null });
    expect(r.success).toBe(false);
  });

  it("rejects a compare-at price lower than the price", () => {
    const r = productInputSchema.safeParse({ ...base, compare_at_price_cents: base.price_cents - 1 });
    expect(r.success).toBe(false);
  });

  it("rejects malformed slugs and fractional prices", () => {
    expect(productInputSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, price_cents: 10.5 }).success).toBe(false);
  });
});

describe("loadProductData error messages", () => {
  it("names the file, product and field that is wrong", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "products-"));
    const bad = { ...products[0], price_cents: "79.00" };
    fs.writeFileSync(path.join(dir, "broken.json"), JSON.stringify([bad]));
    fs.writeFileSync(path.join(dir, "syntax.json"), "[{ oops");
    expect(() => loadProductData(dir)).toThrow(`broken.json → product #0 (${bad.slug}) → price_cents`);
    expect(() => loadProductData(dir)).toThrow(/syntax\.json: not valid JSON/);
  });
});
