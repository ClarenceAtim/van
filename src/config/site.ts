/**
 * Store-wide settings. Change the name, contact details, currency, tax or shipping
 * rules here and the whole site (titles, emails, structured data) follows.
 */
export const siteConfig = {
  name: "ScaleHaven Reptiles",
  shortName: "ScaleHaven",
  tagline: "Captive-bred reptiles & expert-chosen supplies",
  description:
    "Healthy captive-bred snakes, geckos, lizards and tortoises with a live arrival guarantee, plus the enclosures, lighting, heating and food to care for them properly.",
  /**
   * Prices in the database are integer cents in this currency (ISO 4217 code). To switch to euros,
   * set currency: "EUR" and locale: "nl-NL" (or "de-DE", "fr-FR"…, which controls number format),
   * then update your product prices.
   */
  currency: "USD",
  locale: "en-US",
  /** Tax/VAT added to the order total. Off by default. Example for VAT: { enabled: true, rate: 0.21, label: "VAT (21%)", note: "Prices exclude VAT." } */
  tax: { enabled: false as boolean, rate: 0 as number, label: "Sales tax" as string, note: "" as string },
  contact: {
    email: "hello@scalehaven.example",
    phone: "+1 (555) 013-2040",
    hours: "Mon–Fri, 9am–5pm Central",
    address: { street: "1200 Riverbend Rd", city: "Austin", region: "TX", postalCode: "78701", country: "US" },
  },
  social: {
    instagram: "https://instagram.com/scalehaven",
    youtube: "https://youtube.com/@scalehaven",
  },
  /** Countries offered at checkout are in src/config/countries.ts. Shipping cost is confirmed by email per order. */
  shipping: {
    /** Live animals ship Monday–Wednesday only so they never sit in a depot over a weekend. */
    liveAnimalShipDays: "Monday–Wednesday",
    /** Same days as numbers (0 = Sunday … 6 = Saturday). Overnight delivery is the next day. */
    liveAnimalShipWeekdays: [1, 2, 3] as readonly number[],
    /** Orders need at least this many days to be confirmed, paid and packed before the first possible ship day. */
    liveAnimalLeadDays: 2,
  },
  liveAnimals: {
    minimumAge: 18,
    /** Live animals only ship to these countries (supplies ship worldwide). */
    shipToCountries: ["US"] as readonly string[],
    /** …and not to these US states (Hawaii bans most reptiles; Alaska is too far for reliable overnight delivery). */
    excludedUsStates: ["AK", "HI"] as readonly string[],
  },
} as const;

export type SiteConfig = typeof siteConfig;
