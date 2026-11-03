"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import type { TurnstileProps } from "@marsidev/react-turnstile";
import { publicEnv } from "@/lib/env";

/**
 * Cloudflare Turnstile challenge. Adds a hidden `turnstileToken` field to the
 * surrounding form. Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 *
 * The widget library and Cloudflare's script load only when the form scrolls into view or
 * someone starts typing in it (a plain import() keeps them out of the page's preloaded scripts).
 */
export function Turnstile({ onToken }: { onToken?: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [Widget, setWidget] = useState<ComponentType<TurnstileProps> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || Widget) return;
    let cancelled = false;
    const load = () => {
      io.disconnect();
      import("@marsidev/react-turnstile").then((m) => !cancelled && setWidget(() => m.Turnstile));
    };
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && load(), { rootMargin: "200px" });
    io.observe(el);
    const form = el.closest("form");
    form?.addEventListener("focusin", load, { once: true });
    return () => {
      cancelled = true;
      io.disconnect();
      form?.removeEventListener("focusin", load);
    };
  }, [Widget]);

  if (!publicEnv.turnstileSiteKey) return null;
  // Reserves the widget's height so the form doesn't jump when it appears.
  return (
    <div ref={ref} className="min-h-[65px]">
      {Widget && (
        <Widget
          siteKey={publicEnv.turnstileSiteKey}
          options={{ responseFieldName: "turnstileToken", theme: "light", size: "flexible" }}
          onSuccess={onToken}
        />
      )}
    </div>
  );
}
