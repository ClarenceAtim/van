import type { NextConfig } from "next";

// Neon Object Storage endpoint (admin-uploaded product images are served from the public_read bucket).
const storageUrl = process.env.AWS_ENDPOINT_URL_S3 ? new URL(process.env.AWS_ENDPOINT_URL_S3) : null;
const isDev = process.env.NODE_ENV !== "production";
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");


/**
 * Content-Security-Policy. Next.js inlines small bootstrap scripts, so 'unsafe-inline'
 * is required for scripts without per-request nonces (which would disable static
 * rendering). Everything else is locked to our own origin plus the few services we use.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${storageUrl ? storageUrl.origin : ""}`,
  "font-src 'self'",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Only upgrade when the site is served over HTTPS (keeps local `next start` on http working).
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Admin product image uploads (validated to 5 MB in the action).
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: {
    formats: ["image/avif", "image/webp"],
    // Optimised images are re-used for 31 days (deploys clear the cache, so replaced photos still update).
    minimumCacheTTL: 2678400,
    remotePatterns: storageUrl ? [{ protocol: "https", hostname: storageUrl.hostname, pathname: "/product-uploads/**" }] : [],
  },
  async headers() {
    // Product and blog photos keep their file names when replaced, so cache for a week and revalidate in the background.
    const imageCache = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/products/:file*", headers: imageCache },
      { source: "/blog/:file([a-z0-9-]+\\.webp)", headers: imageCache },
    ];
  },
};

export default nextConfig;
