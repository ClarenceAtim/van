"use client";

import { Turnstile as CfTurnstile } from "@marsidev/react-turnstile";
import { publicEnv } from "@/lib/env";

/**
 * Cloudflare Turnstile challenge. Adds a hidden `turnstileToken` field to the
 * surrounding form. Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 */
export function Turnstile({ onToken }: { onToken?: (token: string) => void }) {
  if (!publicEnv.turnstileSiteKey) return null;
  return (
    <CfTurnstile
      siteKey={publicEnv.turnstileSiteKey}
      options={{ responseFieldName: "turnstileToken", theme: "light", size: "flexible" }}
      onSuccess={onToken}
    />
  );
}
