import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { MAX_LIVE_ANIMALS_PER_ORDER, MAX_QUANTITY_PER_LINE, computeTotals, lineTotal, validateLines, type PricedLine } from "@/lib/pricing";

const line = (over: Partial<PricedLine> = {}): PricedLine => ({
  productId: "p1",
  slug: "item",
  name: "Item",
  sku: "SKU-1",
  unitPriceCents: 1999,
  quantity: 1,
  stock: 10,
  isLiveAnimal: false,
  ...over,
});
const s = siteConfig.shipping;

describe("lineTotal", () => {
  it("multiplies integer cents", () => {
    expect(lineTotal({ unitPriceCents: 1999, quantity: 3 })).toBe(5997);
  });
  it("rejects fractional or negative values", () => {
    expect(() => lineTotal({ unitPriceCents: 19.99, quantity: 1 })).toThrow();
    expect(() => lineTotal({ unitPriceCents: 100, quantity: 0 })).toThrow();
    expect(() => lineTotal({ unitPriceCents: -1, quantity: 1 })).toThrow();
  });
});

describe("computeTotals", () => {
  it("charges standard shipping below the free threshold", () => {
    const t = computeTotals([line({ unitPriceCents: 2500, quantity: 2 })]);
    expect(t).toMatchObject({ subtotalCents: 5000, shippingCents: s.standardCents, totalCents: 5000 + s.standardCents, shippingMethod: "standard" });
  });

  it("ships supplies free at or above the threshold", () => {
    const t = computeTotals([line({ unitPriceCents: s.freeStandardOverCents })]);
    expect(t.shippingCents).toBe(0);
    expect(t.shippingMethod).toBe("free-standard");
  });

  it("uses one overnight rate for any order containing live animals", () => {
    const t = computeTotals([line({ unitPriceCents: 39900, isLiveAnimal: true }), line({ slug: "b", unitPriceCents: 16900 })]);
    expect(t.shippingCents).toBe(s.liveAnimalOvernightCents);
    expect(t.shippingMethod).toBe("live-overnight");
    expect(t.containsLiveAnimals).toBe(true);
    expect(t.totalCents).toBe(39900 + 16900 + s.liveAnimalOvernightCents);
  });

  it("returns zero for an empty cart", () => {
    expect(computeTotals([])).toMatchObject({ subtotalCents: 0, shippingCents: 0, totalCents: 0 });
  });
});

describe("validateLines", () => {
  it("flags sold-out and over-stock lines", () => {
    expect(validateLines([line({ stock: 0 })])[0].message).toMatch(/sold out/);
    expect(validateLines([line({ quantity: 5, stock: 2 })])[0].message).toMatch(/Only 2/);
  });
  it("caps quantity per line and live animals per order", () => {
    expect(validateLines([line({ quantity: MAX_QUANTITY_PER_LINE + 1, stock: 99 })]).length).toBeGreaterThan(0);
    const animals = validateLines([line({ isLiveAnimal: true, quantity: MAX_LIVE_ANIMALS_PER_ORDER + 1, stock: 99 })]);
    expect(animals.some((p) => /live animals/.test(p.message))).toBe(true);
  });
  it("accepts a normal cart", () => {
    expect(validateLines([line(), line({ slug: "b", isLiveAnimal: true })])).toEqual([]);
  });
});
