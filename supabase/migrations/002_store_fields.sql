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
