import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { rateLimitHit } from "@/lib/db/inbox";
import { db, isDatabaseConfigured } from "@/lib/db/pool";

export type LimitName = "auth" | "contact" | "newsletter" | "search" | "checkout" | "cart" | "review";

/** requests per window (seconds) */
const LIMITS: Record<LimitName, [number, number]> = {
  auth: [10, 600],
  contact: [5, 3600],
  newsletter: [5, 3600],
  search: [60, 60],
  checkout: [10, 600],
  cart: [120, 60],
  review: [5, 3600],
};

const upstash =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Map(
        (Object.keys(LIMITS) as LimitName[]).map((name) => [
          name,
          new Ratelimit({
            redis: Redis.fromEnv(),
            limiter: Ratelimit.slidingWindow(LIMITS[name][0], `${LIMITS[name][1]} s`),
            prefix: `rl:${name}`,
          }),
        ]),
      )
    : null;

// Last resort for local development without Upstash or Supabase.
const memory = new Map<string, { start: number; count: number }>();

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Returns true when the request is allowed. Keyed by client IP (plus an optional extra key such as an email). */
export async function rateLimit(name: LimitName, extraKey = ""): Promise<boolean> {
  const [limit, windowSeconds] = LIMITS[name];
  const key = `${name}:${await clientIp()}${extraKey ? `:${extraKey.toLowerCase()}` : ""}`;

  if (upstash) {
    const { success } = await upstash.get(name)!.limit(key);
    return success;
  }
  if (isDatabaseConfigured()) {
    try {
      return await rateLimitHit(db(), key, limit, windowSeconds);
    } catch (e) {
      console.error("rate limiter unavailable:", (e as Error).message);
    }
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSeconds * 1000) {
    memory.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}
