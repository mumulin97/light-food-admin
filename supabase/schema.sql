-- Run once in Supabase SQL Editor (Dashboard → SQL → New query)

-- Extensions
create extension if not exists "pgcrypto";

-- Stores
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text not null default '',
  manager text not null default '',
  phone text not null default '',
  status text not null default '营业中' check (status in ('营业中', '已关闭')),
  region text not null default '西海岸' check (region in ('西海岸', '中心区', '港口区')),
  created_at timestamptz not null default now()
);

-- Products (在售单品)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(10, 2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Orders
create sequence if not exists public.order_number_seq start 4407;

create or replace function public.next_order_id()
returns text
language sql
as $$
  select '#QS-' || nextval('public.order_number_seq')::text;
$$;

create table if not exists public.orders (
  id text primary key,
  store_id uuid not null references public.stores (id) on delete restrict,
  customer_name text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null check (status in ('待处理', '制作中', '待取餐', '已完成', '已取消')),
  method text not null check (method in ('堂食', '外带', '外卖')),
  note text,
  member_id text,
  ingredients_deducted boolean not null default false,
  points_accrued boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists orders_store_created_idx on public.orders (store_id, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders (id) on delete cascade,
  product_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10, 2)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- Ingredients (库存预警)
create table if not exists public.ingredients (
  id serial primary key,
  name text not null,
  sku text not null unique,
  stock numeric(12, 2) not null default 0,
  threshold numeric(12, 2) not null default 0
);

-- RLS
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ingredients enable row level security;

drop policy if exists "stores authenticated all" on public.stores;
create policy "stores authenticated all" on public.stores
  for all to authenticated using (true) with check (true);

drop policy if exists "products authenticated all" on public.products;
create policy "products authenticated all" on public.products
  for all to authenticated using (true) with check (true);

drop policy if exists "orders authenticated all" on public.orders;
create policy "orders authenticated all" on public.orders
  for all to authenticated using (true) with check (true);

drop policy if exists "order_items authenticated all" on public.order_items;
create policy "order_items authenticated all" on public.order_items
  for all to authenticated using (true) with check (true);

drop policy if exists "ingredients authenticated all" on public.ingredients;
create policy "ingredients authenticated all" on public.ingredients
  for all to authenticated using (true) with check (true);

-- Seed stores
insert into public.stores (name, address, manager, phone, status, region) values
  ('中心旗舰店', '中心区晨曦路 188 号', '猴猴大王', '138-0000-1001', '营业中', '中心区'),
  ('滨江轻食店', '滨江大道 56 号', '王芳', '138-0000-1002', '营业中', '西海岸'),
  ('云谷外卖店', '云谷科技园区 B 座 1 层', '李明', '138-0000-1003', '营业中', '港口区')
on conflict (name) do nothing;

-- Seed products
insert into public.products (name, price) values
  ('抹茶能量碗', 45),
  ('牛油果高纤卷', 36),
  ('藜麦田园沙拉', 34),
  ('冷萃燕麦杯', 28),
  ('浆果排毒思慕雪', 22),
  ('轻盈双人套餐', 68)
on conflict (name) do nothing;

-- Seed ingredients (3 below threshold for dashboard alert card)
insert into public.ingredients (name, sku, stock, threshold) values
  ('有机牛油果', 'VG-018', 6, 8),
  ('茉莉绿茶底', 'BEV-101', 4, 5),
  ('特级橄榄油', 'OIL-020', 3, 6),
  ('有机藜麦', 'GR-007', 22, 15),
  ('嫩芽菠菜', 'VG-001', 12, 10)
on conflict (sku) do nothing;

-- Helper: seed orders for 中心旗舰店 (last 7 days sample)
do $$
declare
  flagship uuid;
  d date;
  i int;
begin
  select id into flagship from public.stores where name = '中心旗舰店' limit 1;
  if flagship is null then
    return;
  end if;

  if exists (select 1 from public.orders limit 1) then
    return;
  end if;

  perform setval('public.order_number_seq', 4406, true);

  for i in 0..3 loop
    d := (current_date - i);
    insert into public.orders (id, store_id, customer_name, amount, status, method, created_at)
    values
      (public.next_order_id(), flagship, '张伟', 42.50, '制作中', '外带', d + time '12:45'),
      (public.next_order_id(), flagship, '王芳', 18.20, '待处理', '堂食', d + time '12:52'),
      (public.next_order_id(), flagship, '李明', 124.00, '待取餐', '外卖', d + time '12:30'),
      (public.next_order_id(), flagship, '赵敏', 56.75, '已完成', '堂食', d + time '12:15');
  end loop;

  insert into public.order_items (order_id, product_name, quantity, unit_price)
  select o.id, '抹茶能量碗', 1, 45 from public.orders o where o.customer_name = '张伟' and o.amount = 42.50 limit 1;
  insert into public.order_items (order_id, product_name, quantity, unit_price)
  select o.id, '冷萃燕麦杯', 1, 28 from public.orders o where o.customer_name = '王芳' limit 1;
  insert into public.order_items (order_id, product_name, quantity, unit_price)
  select o.id, '轻盈双人套餐', 1, 68 from public.orders o where o.customer_name = '李明' limit 1;
  insert into public.order_items (order_id, product_name, quantity, unit_price)
  select o.id, '牛油果高纤卷', 1, 36 from public.orders o where o.customer_name = '赵敏' limit 1;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on sequence public.order_number_seq to authenticated;
grant execute on function public.next_order_id() to authenticated;
