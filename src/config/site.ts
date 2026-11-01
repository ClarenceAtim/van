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
  /** Countries we ship supplies to (ISO 3166-1 alpha-2). Live animals: see live_animal_regions in /admin/settings. */
  shippingCountries: ["US"] as const,
  shipping: {
    standardCents: 999,
    freeStandardOverCents: 9900,
    liveAnimalOvernightCents: 4999,
    /** Live animals ship Monday–Wednesday only so they never sit in a depot over a weekend. */
    liveAnimalShipDays: "Monday–Wednesday",
  },
  liveAnimals: {
    minimumAge: 18,
  },
} as const;

export type SiteConfig = typeof siteConfig;
