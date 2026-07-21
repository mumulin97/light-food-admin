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
