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
