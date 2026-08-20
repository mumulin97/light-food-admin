-- Business lifecycle fields and safer delete permissions.

alter table public.members
  add column if not exists status text not null default '正常';

alter table public.members drop constraint if exists members_status_check;
alter table public.members add constraint members_status_check
  check (status in ('正常', '冻结', '已注销'));

alter table public.employees
  add column if not exists employment_status text not null default '在职';

alter table public.employees drop constraint if exists employees_employment_status_check;
alter table public.employees add constraint employees_employment_status_check
  check (employment_status in ('在职', '离职'));

alter table public.marketing_campaigns
  add column if not exists archived_at timestamptz;

-- Historical and financial records must not be hard-deleted by the browser client.
revoke delete on public.stores from authenticated;
revoke delete on public.products from authenticated;
revoke delete on public.orders from authenticated;
revoke delete on public.order_items from authenticated;
revoke delete on public.members from authenticated;
revoke delete on public.marketing_campaigns from authenticated;
revoke delete on public.employees from authenticated;
revoke delete on public.system_logs from authenticated;

-- Ingredients and unreferenced suppliers remain the only user-managed hard deletes.
grant delete on public.ingredients to authenticated;
grant delete on public.suppliers to authenticated;
