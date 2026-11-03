"use client";

import { useState } from "react";
import { Check, Link2, Mail } from "lucide-react";

const linkClass = "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted";

/** Share links that work without JavaScript, plus a copy-link button. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const targets = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: "X", href: `https://x.com/intent/post?url=${u}&text=${t}` },
    { label: "Pinterest", href: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-semibold">Share:</span>
      {targets.map((s) => (
        <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={linkClass} aria-label={`Share on ${s.label} (opens in a new tab)`}>
          {s.label}
        </a>
      ))}
      <a href={`mailto:?subject=${t}&body=${u}`} className={linkClass} aria-label="Share by email">
        <Mail className="size-4" aria-hidden /> Email
      </a>
      <button
        type="button"
        className={linkClass}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked: nothing to do */
          }
        }}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
        <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
      </button>
    </div>
  );
}
