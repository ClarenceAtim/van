/**
 * Store-wide settings. Change the name, contact details, currency or shipping
 * rates here and the whole site (titles, emails, structured data) follows.
 */
export const siteConfig = {
  name: "ScaleHaven Reptiles",
  shortName: "ScaleHaven",
  tagline: "Captive-bred reptiles & expert-chosen supplies",
  description:
    "Healthy captive-bred snakes, geckos, lizards and tortoises with a live arrival guarantee, plus the enclosures, lighting, heating and food to care for them properly.",
  /** ISO 4217 code. Prices in the database are integer cents in this currency. */
  currency: "USD",
  locale: "en-US",
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
  /**
   * Countries shown at checkout (ISO 3166-1 alpha-2 code + name). Live animals ship to the US only,
   * to the states allowed in /admin/settings.
   */
  shippingCountries: [{ code: "US", name: "United States" }] as const,
  shipping: {
    standardCents: 999,
    expressCents: 2499,
    freeStandardOverCents: 9900,
    liveAnimalOvernightCents: 4999,
    /** Live animals ship Monday–Wednesday only so they never sit in a depot over a weekend. */
    liveAnimalShipDays: "Monday–Wednesday",
    /** Same days as numbers (0 = Sunday … 6 = Saturday). Overnight delivery is the next day. */
    liveAnimalShipWeekdays: [1, 2, 3] as readonly number[],
    /** Orders need at least this many days to be paid and packed before the first possible ship day. */
    liveAnimalLeadDays: 2,
    /** Let customers collect their order (no shipping charge). */
    localPickup: { enabled: true, label: "Local pickup (Austin, TX)", note: "We'll email you to arrange a pickup time once your order is paid." },
  },
  liveAnimals: {
    minimumAge: 18,
  },
} as const;

export type SiteConfig = typeof siteConfig;
