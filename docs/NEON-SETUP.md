# Neon setup (database + auth)

The store uses **Neon Postgres** for its database and **Neon Auth** (Managed
Better Auth) for customer sign-in. Both live in the same Neon project.

## 1. Create the Neon project

1. Create a free account at <https://neon.tech> and create a project with a
   database (the defaults are fine).
2. In the Neon console, go to **Connection Details** and copy the connection
   strings into `.env.local` (see [`.env.example`](../.env.example)):
   - `DATABASE_URL` — the pooled connection string.
   - `DATABASE_URL_UNPOOLED` — the direct connection string (used for
     migrations).
   
   Or run `neon env pull` from the Neon CLI to generate `.env.local` for you.

## 2. Enable Neon Auth

1. In the Neon console, open **Auth** for your project and enable it.
2. Copy the values into `.env.local`:
   - `NEON_AUTH_BASE_URL`
   - `NEON_AUTH_COOKIE_SECRET`

Sign-in is served by the app itself at `/api/auth/*` — there is no separate
redirect URL to configure.

## 3. Run the migrations

```bash
npm run db:migrate
```

This applies `db/migrations/*.sql` in filename order, once each, and records
what was applied in the `schema_migrations` table.

## 4. Load the products

```bash
npm run sync:products
```

This validates `data/products/*.json` and upserts the products into Neon.
It needs `DATABASE_URL`, plus `NEXT_PUBLIC_SITE_URL` and
`REVALIDATE_SECRET` so it can refresh the live site afterwards.

## 5. Make yourself admin

Admins are promoted in SQL only — the app never lets a user promote
themselves.

1. Sign up on the site first (this creates your profile row).
2. In the Neon console, open the **SQL Editor** and run:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

3. Sign out and back in. `/admin` is now available.

## 6. Optional: image uploads in /admin

Admin image uploads go to **Neon Object Storage** (S3-compatible). Set these
three variables for uploads to work:

- `AWS_ENDPOINT_URL_S3`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Without them, product photos still work — they are served from
`public/products/` in the repo — but the /admin upload button is disabled.
