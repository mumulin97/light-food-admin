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

-- Products (菜单 / 产品目录)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(10, 2) not null check (price >= 0),
  is_active boolean not null default true,
  tag text not null default '',
  category text not null default '沙拉类' check (category in ('沙拉类', '轻食碗', '营养昔', '生酮零食')),
  stock numeric(12, 2) not null default 0,
  unit text not null default '份',
  calories int not null default 0,
  protein numeric(8, 2) not null default 0,
  carbs numeric(8, 2) not null default 0,
  emoji text not null default '🥗',
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
insert into public.products (name, price, is_active, tag, category, stock, unit, calories, protein, carbs, emoji) values
  ('抹茶能量碗', 45, true, '招牌', '轻食碗', 32, '份', 450, 28, 42, '🥣'),
  ('牛油果高纤卷', 36, true, '高人气', '轻食碗', 28, '份', 360, 22, 36, '🥑'),
  ('藜麦田园沙拉', 34, true, '低卡', '沙拉类', 24, '份', 340, 18, 28, '🥗'),
  ('冷萃燕麦杯', 28, true, '清爽', '营养昔', 40, '杯', 280, 12, 32, '🥤'),
  ('浆果排毒思慕雪', 22, true, '抗氧化', '营养昔', 18, '瓶', 220, 8, 40, '🫐'),
  ('轻盈双人套餐', 68, true, '套餐优惠', '轻食碗', 15, '份', 520, 35, 48, '🍱')
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


-- ===== Migrations =====


-- >>> 002_store_fields.sql <<<

-- Run in Supabase SQL Editor if you already ran the original schema.sql (extends stores table)

alter table public.stores add column if not exists address text not null default '';
alter table public.stores add column if not exists manager text not null default '';
alter table public.stores add column if not exists phone text not null default '';
alter table public.stores add column if not exists status text not null default '营业中';
alter table public.stores add column if not exists region text not null default '西海岸';

alter table public.stores drop constraint if exists stores_status_check;
alter table public.stores add constraint stores_status_check
  check (status in ('营业中', '已关闭'));

alter table public.stores drop constraint if exists stores_region_check;
alter table public.stores add constraint stores_region_check
  check (region in ('西海岸', '中心区', '港口区'));

update public.stores set
  address = case name
    when '中心旗舰店' then '中心区晨曦路 188 号'
    when '滨江轻食店' then '滨江大道 56 号'
    when '云谷外卖店' then '云谷科技园区 B 座 1 层'
    else coalesce(nullif(address, ''), '待补充地址')
  end,
  manager = case name
    when '中心旗舰店' then '猴猴大王'
    when '滨江轻食店' then '王芳'
    when '云谷外卖店' then '李明'
    else coalesce(nullif(manager, ''), '待分配')
  end,
  phone = case name
    when '中心旗舰店' then '138-0000-1001'
    when '滨江轻食店' then '138-0000-1002'
    when '云谷外卖店' then '138-0000-1003'
    else coalesce(nullif(phone, ''), '-')
  end,
  region = case name
    when '中心旗舰店' then '中心区'
    when '滨江轻食店' then '西海岸'
    when '云谷外卖店' then '港口区'
    else coalesce(nullif(region, ''), '中心区')
  end,
  status = coalesce(nullif(status, ''), '营业中')
where true;

-- >>> 003_order_flags.sql <<<

-- Run if orders table already exists without fulfillment flags

alter table public.orders add column if not exists ingredients_deducted boolean not null default false;
alter table public.orders add column if not exists points_accrued boolean not null default false;

update public.orders
set
  ingredients_deducted = status in ('制作中', '待取餐', '已完成'),
  points_accrued = status = '已完成'
where true;

-- >>> 004_products_catalog.sql <<<

-- Extend products for 产品目录 (run if you already have the base schema)

alter table public.products add column if not exists tag text not null default '';
alter table public.products add column if not exists category text not null default '沙拉类';
alter table public.products add column if not exists stock numeric(12, 2) not null default 0;
alter table public.products add column if not exists unit text not null default '份';
alter table public.products add column if not exists calories int not null default 0;
alter table public.products add column if not exists protein numeric(8, 2) not null default 0;
alter table public.products add column if not exists carbs numeric(8, 2) not null default 0;
alter table public.products add column if not exists emoji text not null default '🥗';

alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('沙拉类', '轻食碗', '营养昔', '生酮零食'));

update public.products set
  tag = case name
    when '抹茶能量碗' then '招牌'
    when '牛油果高纤卷' then '高人气'
    when '藜麦田园沙拉' then '低卡'
    when '冷萃燕麦杯' then '清爽'
    when '浆果排毒思慕雪' then '抗氧化'
    when '轻盈双人套餐' then '套餐优惠'
    else coalesce(nullif(tag, ''), '推荐')
  end,
  category = case name
    when '抹茶能量碗' then '轻食碗'
    when '牛油果高纤卷' then '轻食碗'
    when '藜麦田园沙拉' then '沙拉类'
    when '冷萃燕麦杯' then '营养昔'
    when '浆果排毒思慕雪' then '营养昔'
    when '轻盈双人套餐' then '轻食碗'
    else coalesce(nullif(category, ''), '沙拉类')
  end,
  stock = case when stock = 0 then 32 else stock end,
  calories = case name
    when '抹茶能量碗' then 450
    when '牛油果高纤卷' then 360
    when '藜麦田园沙拉' then 340
    when '冷萃燕麦杯' then 280
    when '浆果排毒思慕雪' then 220
    when '轻盈双人套餐' then 520
    else calories
  end,
  protein = case name
    when '抹茶能量碗' then 28
    when '牛油果高纤卷' then 22
    when '藜麦田园沙拉' then 18
    when '冷萃燕麦杯' then 12
    when '浆果排毒思慕雪' then 8
    when '轻盈双人套餐' then 35
    else protein
  end,
  carbs = case name
    when '抹茶能量碗' then 42
    when '牛油果高纤卷' then 36
    when '藜麦田园沙拉' then 28
    when '冷萃燕麦杯' then 32
    when '浆果排毒思慕雪' then 40
    when '轻盈双人套餐' then 48
    else carbs
  end,
  emoji = case name
    when '抹茶能量碗' then '🥣'
    when '牛油果高纤卷' then '🥑'
    when '藜麦田园沙拉' then '🥗'
    when '冷萃燕麦杯' then '🥤'
    when '浆果排毒思慕雪' then '🫐'
    when '轻盈双人套餐' then '🍱'
    else emoji
  end
where true;

-- >>> 005_remaining_modules.sql <<<

-- Remaining modules: ingredients (extend), suppliers, members, campaigns, employees, system_logs

-- Ingredients (extend existing table)
alter table public.ingredients add column if not exists emoji text not null default '🥗';
alter table public.ingredients add column if not exists category text not null default '蔬菜';
alter table public.ingredients add column if not exists price numeric(12, 2) not null default 0;
alter table public.ingredients add column if not exists unit text not null default 'kg';
alter table public.ingredients add column if not exists supplier_name text not null default '待指定';

update public.ingredients set
  emoji = coalesce(nullif(emoji, ''), '🥗'),
  category = coalesce(nullif(category, ''), '蔬菜'),
  supplier_name = coalesce(nullif(supplier_name, ''), '鲜农源配送')
where true;

-- Suppliers
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text not null default '',
  category text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  status text not null default '激活' check (status in ('激活', '停用')),
  score text not null default 'A',
  fulfillment int not null default 95,
  license_no text not null default '',
  license_expiry date not null default (current_date + 180),
  created_at timestamptz not null default now()
);

-- Members
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  tier text not null default '白银会员' check (tier in ('白银会员', '黄金会员', '钻石会员')),
  points int not null default 0,
  balance numeric(12, 2) not null default 0,
  spent numeric(12, 2) not null default 0,
  joined_on date not null default current_date,
  portrait_index int not null default 0,
  created_at timestamptz not null default now()
);

-- Marketing campaigns
create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default 'megaphone',
  description text not null default '',
  enabled boolean not null default true,
  usage_label text not null default '使用次数',
  usage_text text not null default '0 次',
  roi text not null default '无数据',
  expiry_text text not null default '长期有效',
  scheduled boolean not null default false,
  created_at timestamptz not null default now()
);

-- Employees
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default '员工',
  store_name text not null default '中心旗舰店',
  status text not null default '在线',
  initials text not null default '',
  avatar_color text not null default '#dcefe5',
  portrait_index int not null default 0,
  created_at timestamptz not null default now()
);

-- System logs
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  initials text not null default 'SYS',
  user_name text not null default '',
  module text not null default '',
  action text not null default '',
  target text not null default '',
  ip text not null default '',
  status text not null default '成功',
  created_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;
alter table public.members enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.employees enable row level security;
alter table public.system_logs enable row level security;

drop policy if exists "suppliers authenticated all" on public.suppliers;
create policy "suppliers authenticated all" on public.suppliers for all to authenticated using (true) with check (true);

drop policy if exists "members authenticated all" on public.members;
create policy "members authenticated all" on public.members for all to authenticated using (true) with check (true);

drop policy if exists "campaigns authenticated all" on public.marketing_campaigns;
create policy "campaigns authenticated all" on public.marketing_campaigns for all to authenticated using (true) with check (true);

drop policy if exists "employees authenticated all" on public.employees;
create policy "employees authenticated all" on public.employees for all to authenticated using (true) with check (true);

drop policy if exists "system_logs authenticated all" on public.system_logs;
create policy "system_logs authenticated all" on public.system_logs for all to authenticated using (true) with check (true);

-- Seed suppliers (skip if any exist)
insert into public.suppliers (name, address, category, contact_name, phone, status, score, fulfillment, license_no, license_expiry)
select * from (values
  ('晨曦有机牧场', '浙江省杭州市余杭区农科园 12 号', '乳制品/有机奶', '李明诚', '138-0000-1234', '激活', 'A+', 99, 'SP-3301-0148', current_date + 18),
  ('绿野农庄配送中心', '上海市松江区新浜农产品交易中心', '新鲜蔬菜/菌菇', '王小野', '156-8888-5678', '激活', 'A+', 100, 'SP-3101-0292', current_date + 26),
  ('丰收果园贸易公司', '成都市双流区农副产品批发市场', '时令水果', '赵丰', '139-4444-9988', '停用', 'B', 82, 'SP-5101-0377', current_date - 12),
  ('原味食品有限公司', '广东省广州市天河区高新路 88 号', '调味品/半成品', '张思语', '135-2222-3333', '激活', 'A', 96, 'SP-4401-0512', current_date + 200)
) as v(name, address, category, contact_name, phone, status, score, fulfillment, license_no, license_expiry)
where not exists (select 1 from public.suppliers limit 1);

insert into public.members (name, phone, tier, points, balance, spent, joined_on, portrait_index)
select * from (values
  ('罗艾琳', '138-0012-3456', '钻石会员', 15420, 245.00, 4120.50, date '2022-10-12', 0),
  ('陈马克', '139-0987-6543', '黄金会员', 8200, 12.40, 1850.25, date '2023-01-05', 1),
  ('珍妮佛', '136-0234-5678', '白银会员', 2150, 0.00, 450.00, date '2024-03-18', 2),
  ('王思睿', '137-1122-3344', '黄金会员', 6890, 88.00, 1620.00, date '2023-05-20', 3)
) as v(name, phone, tier, points, balance, spent, joined_on, portrait_index)
where not exists (select 1 from public.members limit 1);

insert into public.marketing_campaigns (name, icon, description, enabled, usage_label, usage_text, roi, expiry_text, scheduled)
select * from (values
  ('满减大促', 'piggy', '单笔订单满 ¥50 减 ¥10。适用于所有午餐菜单。', true, '使用次数', '1,240 次', '+18.5%', '14 天后过期', false),
  ('超值套餐', 'receipt', '购买任意沙拉即可享受鲜榨果汁 5 折优惠。', true, '使用次数', '856 次', '+12.2%', '长期有效', false),
  ('节日狂欢', 'party', '10 人以上团体订餐可享 8 折优惠专享套餐。', false, '历史使用', '2,410 次', '无数据', '计划于 12 月 1 日上线', true)
) as v(name, icon, description, enabled, usage_label, usage_text, roi, expiry_text, scheduled)
where not exists (select 1 from public.marketing_campaigns limit 1);

insert into public.employees (name, email, role, store_name, status, initials, avatar_color, portrait_index)
select * from (values
  ('马库斯·索恩', 'marcus.t@lightbites.com', '厨师长', '中心旗舰店', '在线', 'MS', '#d7eee0', 0),
  ('萨拉·詹宁斯', 'sarah.j@lightbites.com', '经理', '滨江轻食店', '值班中', 'SJ', '#e2edf8', 1),
  ('陈大卫', 'david.c@lightbites.com', '员工', '云谷外卖店', '离线', 'DC', '#f4e6d5', 2),
  ('林晓雯', 'xiaowen.l@lightbites.com', '营养师', '中心旗舰店', '在线', 'LX', '#d9eeee', 4)
) as v(name, email, role, store_name, status, initials, avatar_color, portrait_index)
where not exists (select 1 from public.employees limit 1);

insert into public.system_logs (initials, user_name, module, action, target, ip, status, created_at)
select * from (values
  ('SJ', '萨拉·詹宁斯', '订单', '创建', '订单号 #8841', '192.168.1.45', '成功', now() - interval '2 hours'),
  ('MS', '马库斯·索恩', '库存', '调整', '牛油果库存 -12', '192.168.1.21', '成功', now() - interval '5 hours'),
  ('SYS', '系统 内核', '安全', '认证', '密钥续期', '127.0.0.1', '成功', now() - interval '6 hours')
) as v(initials, user_name, module, action, target, ip, status, created_at)
where not exists (select 1 from public.system_logs limit 1);

grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.members to authenticated;
grant select, insert, update, delete on public.marketing_campaigns to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.system_logs to authenticated;

-- >>> 006_notifications.sql <<<

-- In-app notifications (title/body stored in DB; read state per user)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  icon text not null default 'warning',
  icon_class text not null default 'warning',
  created_at timestamptz not null default now()
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists notification_reads_user_id_idx on public.notification_reads (user_id);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

drop policy if exists "notifications select authenticated" on public.notifications;
create policy "notifications select authenticated" on public.notifications
  for select to authenticated using (true);

drop policy if exists "notification_reads own" on public.notification_reads;
create policy "notification_reads own" on public.notification_reads
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.notifications to authenticated;
grant select, insert, update, delete on public.notification_reads to authenticated;

-- Seed demo notifications (skip if any row exists)
insert into public.notifications (title, body, icon, icon_class, created_at)
select * from (values
  ('3 种原料库存不足', '建议今天完成补货', 'warning', 'warning', now() - interval '8 minutes'),
  ('订单 #8841 待处理', '客户张伟 · 堂食 · ¥128', 'receipt', 'info', now() - interval '25 minutes'),
  ('供应商证照提醒', '晨曦有机牧场证照将于 18 天内到期', 'warning', 'warning', now() - interval '2 hours')
) as v(title, body, icon, icon_class, created_at)
where not exists (select 1 from public.notifications limit 1);