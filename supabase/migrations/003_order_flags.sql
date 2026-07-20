-- Run if orders table already exists without fulfillment flags

alter table public.orders add column if not exists ingredients_deducted boolean not null default false;
alter table public.orders add column if not exists points_accrued boolean not null default false;

update public.orders
set
  ingredients_deducted = status in ('制作中', '待取餐', '已完成'),
  points_accrued = status = '已完成'
where true;
