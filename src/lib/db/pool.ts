import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { Pool, types } from "pg";
import type { Queryable } from "./types";

// Return timestamps as ISO strings (what pages and JSON-LD expect), not Date objects.
types.setTypeParser(1184, (v) => new Date(v).toISOString());
types.setTypeParser(1114, (v) => new Date(`${v}Z`).toISOString());

let pool: Pool | null = null;

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

/**
 * Pooled Postgres connection to Neon (Lakebase Postgres). On Vercel Fluid compute,
 * attachDatabasePool releases idle clients before a function instance is suspended.
 */
export function db(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 10_000 });
    attachDatabasePool(pool);
  }
  return pool;
}

/** Runs `fn` inside a transaction on one pooled connection. */
export async function transaction<T>(fn: (q: Queryable) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
