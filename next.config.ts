import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : null;
const isDev = process.env.NODE_ENV !== "production";
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

const supabaseSources = supabaseHost ? `https://${supabaseHost} wss://${supabaseHost}` : "";

/**
 * Content-Security-Policy. Next.js inlines small bootstrap scripts, so 'unsafe-inline'
 * is required for scripts without per-request nonces (which would disable static
 * rendering). Everything else is locked to our own origin plus the few services we use.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseHost ? `https://${supabaseHost}` : ""}`,
  "font-src 'self'",
  `connect-src 'self' https://challenges.cloudflare.com ${supabaseSources}`,
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
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
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.stripe.com\"), usb=()" },
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
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : [],
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
