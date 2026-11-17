import Image from "next/image";
import { siteConfig } from "@/config/site";

/** Wordmark: the snake-on-branch emblem plus the store name. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`} role="img" aria-label={siteConfig.name}>
      <Image src="/logo.webp" alt="" width={80} height={80} className="h-full w-auto rounded-md" priority />
      <span className="flex items-baseline gap-1.5">
        <span style={{ fontFamily: "var(--font-display), Georgia, serif" }} className="text-[20px] font-semibold tracking-[-0.3px] text-current">
          ScaleHaven
        </span>
        <span style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }} className="text-[10px] font-semibold tracking-[2.2px] text-[var(--leaf)]">
          REPTILES
        </span>
      </span>
    </span>
  );
}
