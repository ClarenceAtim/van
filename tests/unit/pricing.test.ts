import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import {
  MAX_LIVE_ANIMALS_PER_ORDER,
  MAX_QUANTITY_PER_LINE,
  computeTotals,
  lineTotal,
  liveAnimalShippingProblem,
  liveDeliveryDates,
  taxFor,
  validateLines,
  type PricedLine,
} from "@/lib/pricing";

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
  it("totals the cart before shipping (shipping is confirmed by email)", () => {
    const t = computeTotals([line({ unitPriceCents: 2500, quantity: 2 }), line({ slug: "b", unitPriceCents: 1000 })]);
    expect(t).toMatchObject({ subtotalCents: 6000, taxCents: 0, totalCents: 6000, itemCount: 3, containsLiveAnimals: false });
  });

  it("flags carts with live animals", () => {
    expect(computeTotals([line({ isLiveAnimal: true })]).containsLiveAnimals).toBe(true);
  });

  it("adds tax only when it is switched on in the config", () => {
    expect(taxFor(10000)).toBe(0);
    const tax = siteConfig.tax as { enabled: boolean; rate: number };
    const before = { ...tax };
    try {
      Object.assign(tax, { enabled: true, rate: 0.21 });
      expect(computeTotals([line({ unitPriceCents: 1999 })])).toMatchObject({ subtotalCents: 1999, taxCents: 420, totalCents: 2419 });
    } finally {
      Object.assign(tax, before);
    }
  });

  it("returns zero for an empty cart", () => {
    expect(computeTotals([])).toMatchObject({ subtotalCents: 0, totalCents: 0, itemCount: 0 });
  });
});

describe("liveAnimalShippingProblem", () => {
  it("allows the countries and states in the config", () => {
    expect(liveAnimalShippingProblem("US", "TX")).toBeNull();
  });
  it("blocks other countries and excluded US states", () => {
    expect(liveAnimalShippingProblem("DE", "")).toContain("Germany");
    expect(liveAnimalShippingProblem("US", "HI")).toContain("Hawaii");
  });
});

describe("liveDeliveryDates", () => {
  it("offers weekday deliveries after the lead time", () => {
    const dates = liveDeliveryDates(new Date("2026-11-02T15:00:00Z"), 6); // Monday
    expect(dates[0]).toBe("2026-11-05"); // ships Wed after the 2-day lead, delivered Thu
    for (const d of dates) expect([2, 3, 4]).toContain(new Date(`${d}T12:00:00Z`).getUTCDay());
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
