import { siteConfig } from "@/config/site";

/** SVG wordmark: a scale-pattern leaf mark plus the store name. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 236 40" role="img" aria-label={siteConfig.name} className={className}>
      <g>
        <path d="M20 2C9 8 4 17 4 26c0 7 6 12 16 12s16-5 16-12C36 17 31 8 20 2Z" fill="var(--primary)" />
        <path d="M12 22c2.5-2 5.5-2 8 0 2.5-2 5.5-2 8 0M10 29c3-2.2 6.8-2.2 10 0 3.2-2.2 7-2.2 10 0M15 15.5c1.7-1.4 3.4-1.4 5 0 1.6-1.4 3.3-1.4 5 0" fill="none" stroke="var(--sand)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <text x="46" y="27" fontFamily="var(--font-display), Georgia, serif" fontSize="22" fontWeight="600" fill="currentColor" letterSpacing="-0.3">
        ScaleHaven
      </text>
      <text x="168" y="27" fontFamily="var(--font-sans), system-ui, sans-serif" fontSize="11" fontWeight="600" fill="var(--leaf)" letterSpacing="2.2">
        REPTILES
      </text>
    </svg>
  );
}
