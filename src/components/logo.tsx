import { siteConfig } from "@/config/site";

/** SVG wordmark: a snake forming an S plus the store name. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 250 40" role="img" aria-label={siteConfig.name} className={className}>
      <g>
        <path d="M29 8 C17 8 13 13 19 18 C25 23 25 29 15 32" fill="none" stroke="var(--primary)" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M29 8 C17 8 13 13 19 18 C25 23 25 29 15 32" fill="none" stroke="var(--sand)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="0.1 4.5" />
        <circle cx="29" cy="8" r="5" fill="var(--primary)" />
        <circle cx="30.6" cy="6.4" r="1.3" fill="var(--sand)" />
        <path d="M33.5 9.5 L37 8.5 M33.5 9.5 L36.5 12" fill="none" stroke="#c9a24b" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <text x="46" y="27" fontFamily="var(--font-display), Georgia, serif" fontSize="22" fontWeight="600" fill="currentColor" letterSpacing="-0.3">
        ScaleHaven
      </text>
      <text x="180" y="27" fontFamily="var(--font-sans), system-ui, sans-serif" fontSize="11" fontWeight="600" fill="var(--leaf)" letterSpacing="2.2">
        REPTILES
      </text>
    </svg>
  );
}
