/**
 * Applies db/migrations/*.sql to the Neon database, in filename order, once each.
 *
 *   npm run db:migrate
 *
 * Uses DATABASE_URL_UNPOOLED (direct connection, recommended for migrations) and
 * falls back to DATABASE_URL. Each migration runs in its own transaction.
 */
import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

loadEnv({ path: ".env.local" });
loadEnv();

const DIR = path.join(process.cwd(), "db", "migrations");

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (run `neon env pull`)");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
    const { rows } = await client.query<{ name: string }>("select name from schema_migrations");
    const applied = new Set(rows.map((r) => r.name));
    const pending = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql") && !applied.has(f)).sort();
    if (!pending.length) {
      console.log("✔ Database is up to date");
      return;
    }
    for (const file of pending) {
      process.stdout.write(`• ${file} … `);
      await client.query("begin");
      try {
        await client.query(fs.readFileSync(path.join(DIR, file), "utf8"));
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
        console.log("applied");
      } catch (e) {
        await client.query("rollback");
        throw new Error(`${file}: ${(e as Error).message}`);
      }
    }
    console.log(`✔ Applied ${pending.length} migration(s)`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(`✖ ${(e as Error).message}`);
  process.exit(1);
});
