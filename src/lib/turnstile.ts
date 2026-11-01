import "server-only";
import { clientIp } from "@/lib/rate-limit";

export const isTurnstileConfigured = () => Boolean(process.env.TURNSTILE_SECRET_KEY);

/** Verifies a Cloudflare Turnstile token server-side. */
export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Not configured yet (local development). /admin shows a warning until it is set.
    if (process.env.NODE_ENV === "production") console.warn("TURNSTILE_SECRET_KEY is not set: bot protection is disabled");
    return true;
  }
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token, remoteip: await clientIp() });
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
