import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";
import { redirect } from "next/navigation";
import { ensureProfile, type Profile } from "@/lib/db/account";
import { db, isDatabaseConfigured } from "@/lib/db/pool";

export const isAuthConfigured = () => Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);

let instance: ReturnType<typeof createNeonAuth> | null = null;

/** Neon Auth (Managed Better Auth). Created lazily so builds work before the env vars exist. */
export function auth() {
  if (!isAuthConfigured()) throw new Error("Neon Auth is not configured: set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET");
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },  });
  return instance;
}

export type SessionUser = { id: string; email: string; name: string | null };

/** The signed-in user, verified by Neon Auth, or null. */
export async function getUser(): Promise<SessionUser | null> {
  if (!isAuthConfigured()) return null;
  const { data } = await auth().getSession();
  const u = data?.user;
  return u ? { id: u.id, email: u.email, name: u.name ?? null } : null;
}

/** The signed-in user's store profile (created on first visit). `role` is never set from the session. */
export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user || !isDatabaseConfigured()) return null;
  return ensureProfile(db(), user);
}

/** For account pages: the signed-in user's profile, or a redirect to login. */
export async function requireProfile(next = "/account"): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return profile;
}
