create table if not exists public.user_finances (
  user_id uuid primary key references auth.users (id) on delete cascade,
  allowance numeric(12, 2) not null default 0 check (allowance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.savings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  note text not null default 'Savings',
  saving_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, expense_date desc);

create index if not exists savings_user_date_idx
  on public.savings (user_id, saving_date desc);

alter table public.user_finances enable row level security;
alter table public.expenses enable row level security;
alter table public.savings enable row level security;

drop policy if exists "Users manage their finances"
  on public.user_finances;
create policy "Users manage their finances"
  on public.user_finances
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their expenses"
  on public.expenses;
create policy "Users manage their expenses"
  on public.expenses
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their savings"
  on public.savings;
create policy "Users manage their savings"
  on public.savings
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.reset_tracker_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.expenses where user_id = current_user_id;
  delete from public.savings where user_id = current_user_id;

  insert into public.user_finances (user_id, allowance, updated_at)
  values (current_user_id, 0, now())
  on conflict (user_id)
  do update set allowance = 0, updated_at = now();
end;
$$;

revoke all on function public.reset_tracker_data() from public, anon;
grant execute on function public.reset_tracker_data() to authenticated;

grant select, insert, update, delete
  on public.user_finances, public.expenses, public.savings
  to authenticated;
