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

export type ShippingMethod = "standard" | "free-standard" | "express" | "live-overnight" | "pickup";

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
  // No sales tax is charged yet; add it here if you start collecting it.
  const taxCents = 0;
  return { subtotalCents, ...shipping, taxCents, totalCents: subtotalCents + shipping.shippingCents + taxCents, containsLiveAnimals };
}

// ───────────── Delivery options (checkout step 2) ─────────────

export type DeliveryOption = { id: ShippingMethod; label: string; description: string; cents: number };

/** The delivery methods a cart can use. Live animals must go overnight (or be collected). */
export function deliveryOptions(subtotalCents: number, containsLiveAnimals: boolean): DeliveryOption[] {
  const s = siteConfig.shipping;
  const options: DeliveryOption[] = [];
  if (containsLiveAnimals) {
    options.push({ id: "live-overnight", label: "Overnight live animal shipping", description: `Insulated box, ships ${s.liveAnimalShipDays} for next-day delivery.`, cents: s.liveAnimalOvernightCents });
  } else {
    const free = subtotalCents >= s.freeStandardOverCents;
    options.push(
      free
        ? { id: "free-standard", label: "Free standard shipping", description: "3–5 business days.", cents: 0 }
        : { id: "standard", label: "Standard shipping", description: "3–5 business days.", cents: s.standardCents },
      { id: "express", label: "Express shipping", description: "1–2 business days.", cents: s.expressCents },
    );
  }
  if (s.localPickup.enabled) options.push({ id: "pickup", label: s.localPickup.label, description: s.localPickup.note, cents: 0 });
  return options;
}

/** Totals for a chosen delivery method, or null if the cart can't use that method. */
export function totalsWithDelivery(lines: Pick<PricedLine, "unitPriceCents" | "quantity" | "isLiveAnimal">[], method: string): OrderTotals | null {
  const base = computeTotals(lines);
  const option = deliveryOptions(base.subtotalCents, base.containsLiveAnimals).find((o) => o.id === method);
  if (!option) return null;
  return { ...base, shippingCents: option.cents, shippingMethod: option.id, shippingLabel: option.label, totalCents: base.subtotalCents + option.cents + base.taxCents };
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
