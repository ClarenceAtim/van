import { countryName, regionName } from "@/config/countries";
import { siteConfig } from "@/config/site";

/** Everything price-related is computed here, on the server, from catalog prices — never from the browser. */
export type PricedLine = {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
  stock: number;
  isLiveAnimal: boolean;
};

/**
 * Totals before shipping. Shipping depends on the destination and is confirmed by email per
 * order, so it isn't part of the checkout total. Tax/VAT comes from siteConfig.tax.
 */
export type OrderTotals = {
  subtotalCents: number;
  taxCents: number;
  /** Subtotal + tax (shipping is added when the order is confirmed). */
  totalCents: number;
  itemCount: number;
  containsLiveAnimals: boolean;
};

export const MAX_QUANTITY_PER_LINE = 10;
export const MAX_LIVE_ANIMALS_PER_ORDER = 6;

export function lineTotal(line: Pick<PricedLine, "unitPriceCents" | "quantity">) {
  if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) throw new Error("Invalid unit price");
  if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("Invalid quantity");
  return line.unitPriceCents * line.quantity;
}

/** Tax on the subtotal, rounded to the cent. 0 unless siteConfig.tax is enabled. */
export function taxFor(subtotalCents: number) {
  const t = siteConfig.tax;
  return t.enabled ? Math.round(subtotalCents * t.rate) : 0;
}

export function computeTotals(lines: Pick<PricedLine, "unitPriceCents" | "quantity" | "isLiveAnimal">[]): OrderTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const taxCents = taxFor(subtotalCents);
  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    containsLiveAnimals: lines.some((l) => l.isLiveAnimal),
  };
}

/**
 * Why live animals can't ship to this address, or null if they can. Uses the list in
 * siteConfig.liveAnimals; supplies ship everywhere.
 */
export function liveAnimalShippingProblem(country: string, region: string): string | null {
  const l = siteConfig.liveAnimals;
  if (!country) return null;
  if (!l.shipToCountries.includes(country)) {
    return `Sorry, we can't ship live animals to ${countryName(country)}. Remove the animals from your cart to order supplies, which ship worldwide.`;
  }
  if (country === "US" && region && l.excludedUsStates.includes(region)) {
    return `Sorry, we can't ship live animals to ${regionName(country, region)}. Remove the animals from your cart to order supplies.`;
  }
  return null;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Delivery dates a customer can choose for live animals: the day after each ship day
 * (so always a weekday), starting after the payment/packing lead time.
 */
export function liveDeliveryDates(now = new Date(), count = 10): string[] {
  const s = siteConfig.shipping;
  const dates: string[] = [];
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + s.liveAnimalLeadDays));
  while (dates.length < count) {
    if (s.liveAnimalShipWeekdays.includes(day.getUTCDay())) dates.push(isoDay(new Date(day.getTime() + 86_400_000)));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}

export type CartProblem = { slug: string; message: string };

/** Problems that must be fixed before checkout (out of stock, too many animals…). */
export function validateLines(lines: PricedLine[]): CartProblem[] {
  const problems: CartProblem[] = [];
  for (const l of lines) {
    if (l.stock <= 0) problems.push({ slug: l.slug, message: `${l.name} is sold out.` });
    else if (l.quantity > l.stock) problems.push({ slug: l.slug, message: `Only ${l.stock} of ${l.name} left in stock.` });
    if (l.quantity > MAX_QUANTITY_PER_LINE) problems.push({ slug: l.slug, message: `Maximum ${MAX_QUANTITY_PER_LINE} per item.` });
  }
  const animals = lines.filter((l) => l.isLiveAnimal).reduce((n, l) => n + l.quantity, 0);
  if (animals > MAX_LIVE_ANIMALS_PER_ORDER) {
    problems.push({ slug: "", message: `Please order at most ${MAX_LIVE_ANIMALS_PER_ORDER} live animals per shipment.` });
  }
  return problems;
}
