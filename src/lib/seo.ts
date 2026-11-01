import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/lib/env";
import { productPath } from "@/lib/format";
import type { CatalogProduct, Rating, Review } from "@/lib/catalog";

export const absoluteUrl = (path = "/") => (path.startsWith("http") ? path : `${publicEnv.siteUrl}${path.startsWith("/") ? path : `/${path}`}`);

/** Page metadata with canonical URL, Open Graph and Twitter cards. */
export function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  type = "website",
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}): Metadata {
  const images = image ? [{ url: absoluteUrl(image), alt: imageAlt ?? title }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type, siteName: siteConfig.name, images },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: images?.map((i) => i.url) },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}

const money = (cents: number) => (cents / 100).toFixed(2);

export function organizationJsonLd() {
  const a = siteConfig.contact.address;
  return {
    "@context": "https://schema.org",
    "@type": "PetStore",
    "@id": `${absoluteUrl("/")}#organization`,
    name: siteConfig.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.png"),
    image: absoluteUrl("/opengraph-image"),
    description: siteConfig.description,
    email: siteConfig.contact.email,
    telephone: siteConfig.contact.phone,
    address: { "@type": "PostalAddress", streetAddress: a.street, addressLocality: a.city, addressRegion: a.region, postalCode: a.postalCode, addressCountry: a.country },
    sameAs: Object.values(siteConfig.social),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.href) })),
  };
}

export function productJsonLd(p: CatalogProduct, rating: Rating | null, reviews: Review[]) {
  const s = siteConfig.shipping;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.short_description,
    sku: p.sku,
    image: p.images.map((i) => absoluteUrl(i.url)),
    url: absoluteUrl(productPath(p)),
    category: p.category,
    brand: { "@type": "Brand", name: siteConfig.name },
    ...(p.species_scientific_name ? { additionalProperty: [{ "@type": "PropertyValue", name: "Species", value: p.species_scientific_name }] } : {}),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(productPath(p)),
      priceCurrency: p.currency,
      price: money(p.price_cents),
      availability: p.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${absoluteUrl("/")}#organization` },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: money(p.is_live_animal ? s.liveAnimalOvernightCents : s.standardCents), currency: p.currency },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: p.is_live_animal ? 1 : 5, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "US",
        returnPolicyCategory: p.is_live_animal ? "https://schema.org/MerchantReturnNotPermitted" : "https://schema.org/MerchantReturnFiniteReturnWindow",
        ...(p.is_live_animal ? {} : { merchantReturnDays: 30, returnMethod: "https://schema.org/ReturnByMail", returnFees: "https://schema.org/ReturnShippingFees" }),
      },
    },
    ...(rating
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average, reviewCount: rating.count, bestRating: 5, worstRating: 1 },
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.author_name },
            datePublished: r.created_at.slice(0, 10),
            name: r.title,
            reviewBody: r.body,
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
          })),
        }
      : {}),
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })),
  };
}

export function articleJsonLd(a: { title: string; description: string; path: string; image?: string; published: string; updated?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    mainEntityOfPage: absoluteUrl(a.path),
    image: a.image ? [absoluteUrl(a.image)] : undefined,
    datePublished: a.published,
    dateModified: a.updated ?? a.published,
    author: { "@type": "Organization", name: siteConfig.name, url: absoluteUrl("/") },
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
  };
}
