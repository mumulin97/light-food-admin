-- 007_miniprogram_anon_policies.sql
-- 在 Supabase Dashboard → SQL Editor 中执行一次
-- 目的：为小程序点单场景开放匿名（anon）读取门店/菜品、写入订单/订单明细的权限
-- 原有 authenticated 策略保留不动，这里新增 anon 策略

-- ===== Stores：anon 可读 =====
drop policy if exists "stores anon select" on public.stores;
create policy "stores anon select" on public.stores
  for select to anon using (true);

-- ===== Products：anon 可读上架商品 =====
drop policy if exists "products anon select active" on public.products;
create policy "products anon select active" on public.products
  for select to anon using (is_active = true);

-- ===== Orders：anon 可读 + 可写 =====
drop policy if exists "orders anon select" on public.orders;
create policy "orders anon select" on public.orders
  for select to anon using (true);

drop policy if exists "orders anon insert" on public.orders;
create policy "orders anon insert" on public.orders
  for insert to anon with check (true);

-- ===== Order Items：anon 可读 + 可写 =====
drop policy if exists "order_items anon select" on public.order_items;
create policy "order_items anon select" on public.order_items
  for select to anon using (true);

drop policy if exists "order_items anon insert" on public.order_items;
create policy "order_items anon insert" on public.order_items
  for insert to anon with check (true);

-- 给 anon 授予相关权限
grant select on public.stores to anon;
grant select on public.products to anon;
grant select, insert on public.orders to anon;
grant select, insert on public.order_items to anon;
grant usage, select on sequence public.order_number_seq to anon;
grant execute on function public.next_order_id() to anon;
