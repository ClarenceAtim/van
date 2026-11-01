import { siteConfig } from "@/config/site";

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(cents: number, currency: string = siteConfig.currency) {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(siteConfig.locale, { style: "currency", currency });
    formatters.set(currency, f);
  }
  return f.format(cents / 100);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(siteConfig.locale, { year: "numeric", month: "short", day: "numeric" });
}

export const productPath = (p: { category: string; slug: string }) => `/shop/${p.category}/${p.slug}`;
