/** Anything that can run a parameterized query: a pg Pool/PoolClient in the app, PGlite in tests. */
export type Queryable = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

/** Returns the first row or null. */
export async function one<T>(q: Queryable, text: string, params: unknown[] = []): Promise<T | null> {
  const { rows } = await q.query<T>(text, params);
  return rows[0] ?? null;
}
