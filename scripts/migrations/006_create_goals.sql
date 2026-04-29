-- User-defined financial goals: target amount + target year. Used both
-- standalone (Goals page) and as context fed into ClarzoGPT so it can answer
-- "am I on track for X?"

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  target_year int not null check (target_year >= 2020 and target_year <= 2100),
  created_at timestamptz default now()
);

create index if not exists idx_goals_user_created
  on public.goals (user_id, created_at desc);

alter table public.goals enable row level security;

drop policy if exists "users read own goals" on public.goals;
create policy "users read own goals"
  on public.goals for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own goals" on public.goals;
create policy "users insert own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);

drop policy if exists "users delete own goals" on public.goals;
create policy "users delete own goals"
  on public.goals for delete
  using (auth.uid() = user_id);
