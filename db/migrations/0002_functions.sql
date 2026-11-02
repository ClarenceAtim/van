-- Server-side SQL functions.

-- Atomically mark an order paid and decrement stock. Idempotent: calling it
-- twice for the same order (Stripe retries webhooks) has no further effect.
create or replace function public.fulfill_order(p_order_id uuid, p_payment_intent text)
returns boolean language plpgsql set search_path = public as $$
declare
  v_updated int;
begin
  update public.orders
     set status = 'paid', stripe_payment_intent_id = p_payment_intent
   where id = p_order_id and status = 'pending';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return false;
  end if;

  update public.products p
     set stock_quantity = greatest(p.stock_quantity - oi.quantity, 0),
         sales_count = p.sales_count + oi.quantity
    from public.order_items oi
   where oi.order_id = p_order_id and oi.product_id = p.id;

  return true;
end $$;

-- Fixed-window rate limiter. Returns true when the request is allowed.
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql set search_path = public as $$
declare
  v_count int;
begin
  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.count + 1 end,
        window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end $$;


-- Product search used by /api/search and the shop page.
create or replace function public.search_products(q text, max_results int default 8)
returns setof public.products language sql stable as $$
  select *
    from public.products
   where active
     and search @@ websearch_to_tsquery('english', q)
   order by ts_rank(search, websearch_to_tsquery('english', q)) desc, sales_count desc
   limit least(max_results, 50)
$$;

