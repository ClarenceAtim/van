import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/** Private and transactional pages are blocked here and never listed in the sitemap. */
const PRIVATE_PATHS = [
  "/admin",
  "/account",
  "/api/",
  "/cart",
  "/checkout",
  "/login",
  "/signup",
  "/auth/",
  "/search",
  "/not-found-admin",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
