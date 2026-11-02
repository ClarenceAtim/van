import { one, type Queryable } from "./types";

export async function addContactMessage(q: Queryable, m: { name: string; email: string; subject: string; message: string }) {
  await q.query("insert into contact_messages (name, email, subject, message) values ($1, $2, $3, $4)", [m.name, m.email, m.subject, m.message]);
}

export async function subscribe(q: Queryable, email: string) {
  await q.query("insert into newsletter_subscribers (email) values ($1) on conflict (email) do nothing", [email]);
}

/** Fixed-window limiter in Postgres. Returns true when the request is allowed. */
export async function rateLimitHit(q: Queryable, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const r = await one<{ allowed: boolean }>(q, "select rate_limit_hit($1, $2, $3) as allowed", [key, limit, windowSeconds]);
  return r?.allowed === true;
}
