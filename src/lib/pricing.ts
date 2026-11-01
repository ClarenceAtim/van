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

export type ShippingMethod = "standard" | "free-standard" | "live-overnight";

export type OrderTotals = {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingMethod: ShippingMethod;
  shippingLabel: string;
  containsLiveAnimals: boolean;
};

export const MAX_QUANTITY_PER_LINE = 10;
export const MAX_LIVE_ANIMALS_PER_ORDER = 6;

export function lineTotal(line: Pick<PricedLine, "unitPriceCents" | "quantity">) {
  if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) throw new Error("Invalid unit price");
  if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("Invalid quantity");
  return line.unitPriceCents * line.quantity;
}

export function shippingFor(subtotalCents: number, containsLiveAnimals: boolean): Pick<OrderTotals, "shippingCents" | "shippingMethod" | "shippingLabel"> {
  const s = siteConfig.shipping;
  if (containsLiveAnimals) {
    // One overnight insulated box covers the animals and any supplies in the order.
    return { shippingCents: s.liveAnimalOvernightCents, shippingMethod: "live-overnight", shippingLabel: "Overnight live animal shipping" };
  }
  if (subtotalCents >= s.freeStandardOverCents) {
    return { shippingCents: 0, shippingMethod: "free-standard", shippingLabel: "Free standard shipping" };
  }
  return { shippingCents: s.standardCents, shippingMethod: "standard", shippingLabel: "Standard shipping (3–5 business days)" };
}

export function computeTotals(lines: Pick<PricedLine, "unitPriceCents" | "quantity" | "isLiveAnimal">[]): OrderTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const containsLiveAnimals = lines.some((l) => l.isLiveAnimal);
  const shipping = lines.length ? shippingFor(subtotalCents, containsLiveAnimals) : { shippingCents: 0, shippingMethod: "standard" as const, shippingLabel: "" };
  // Sales tax is calculated by Stripe Tax when enabled; 0 here keeps totals honest until then.
  const taxCents = 0;
  return { subtotalCents, ...shipping, taxCents, totalCents: subtotalCents + shipping.shippingCents + taxCents, containsLiveAnimals };
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
