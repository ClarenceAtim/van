-- ScaleHaven Reptiles: core schema

-- ───────────────────────── Enums ─────────────────────────
create type public.user_role as enum ('customer', 'admin');
create type public.care_level as enum ('beginner', 'intermediate', 'advanced');
create type public.order_status as enum (
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);
create type public.review_status as enum ('pending', 'approved', 'rejected');

-- ───────────────────────── Helpers ─────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- array_to_string is STABLE, so wrap it for use in a generated column
create or replace function public.immutable_array_to_string(arr text[])
returns text language sql immutable parallel safe as $$
  select coalesce(array_to_string(arr, ' '), '')
$$;

-- ───────────────────────── Catalog ─────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  seo_title text,
  seo_description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  category text not null references public.categories (slug) on update cascade,
  subcategory text,
  short_description text not null,
  long_description text not null,
  price_cents int not null check (price_cents > 0),
  compare_at_price_cents int check (compare_at_price_cents is null or compare_at_price_cents > price_cents),
  currency char(3) not null default 'USD',
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  sku text not null unique,
  featured boolean not null default false,
  active boolean not null default true,
  is_live_animal boolean not null default false,
  species_scientific_name text,
  care_level public.care_level,
  adult_size text,
  lifespan text,
  diet text,
  temperature_range text,
  humidity_range text,
  tags text[] not null default '{}',
  seo_title text,
  seo_description text,
  sales_count int not null default 0,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', public.immutable_array_to_string(tags)), 'B') ||
    setweight(to_tsvector('english', coalesce(species_scientific_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(short_description, '') || ' ' || coalesce(long_description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products (category);
create index products_price_idx on public.products (price_cents);
create index products_featured_idx on public.products (featured) where featured;
create index products_created_idx on public.products (created_at desc);
create index products_search_idx on public.products using gin (search);
create index products_tags_idx on public.products using gin (tags);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  thumbnail_url text,
  alt text not null,
  width int not null check (width > 0),
  height int not null check (height > 0),
  credit text not null default '',
  license text not null default '',
  source_url text not null default '',
  placeholder boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);

-- ───────────────────────── Users ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text not null,
  postal_code text not null,
  country char(2) not null default 'US',
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ───────────────────────── Carts ─────────────────────────
-- Guest carts have user_id null and are only reachable through server routes
-- (service role) using the httpOnly cart cookie.
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity int not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

-- ───────────────────────── Orders ─────────────────────────
create sequence public.order_number_seq start 10001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SH-' || nextval('public.order_number_seq')),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  status public.order_status not null default 'pending',
  subtotal_cents int not null check (subtotal_cents >= 0),
  shipping_cents int not null check (shipping_cents >= 0),
  tax_cents int not null default 0 check (tax_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  currency char(3) not null default 'USD',
  shipping_method text not null,
  shipping_address jsonb,
  contains_live_animals boolean not null default false,
  live_animal_ack_at timestamptz,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  tracking_number text,
  carrier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_slug text not null,
  product_name text not null,
  sku text not null,
  unit_price_cents int not null check (unit_price_cents >= 0),
  quantity int not null check (quantity > 0),
  line_total_cents int not null check (line_total_cents >= 0),
  is_live_animal boolean not null default false
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- ───────────────────────── Engagement ─────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  title text not null check (char_length(title) <= 120),
  body text not null check (char_length(body) <= 4000),
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product_idx on public.reviews (product_id, status);

create table public.wishlists (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Regions that live animals may ship to (managed in /admin)
create table public.live_animal_regions (
  code text primary key,            -- e.g. 'US-CA'
  name text not null,
  allowed boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Fixed-window rate limiter used by server routes (service role only)
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null
);

-- ───────────────────────── Triggers ─────────────────────────
create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger addresses_updated before update on public.addresses for each row execute function public.set_updated_at();
create trigger carts_updated before update on public.carts for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();
create trigger regions_updated before update on public.live_animal_regions for each row execute function public.set_updated_at();
