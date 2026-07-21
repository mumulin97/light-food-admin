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
