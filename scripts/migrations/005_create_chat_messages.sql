-- ClarzoGPT chat history. Append-only log of user <-> assistant turns. Used
-- to (a) restore the conversation when the user returns to /dashboard/ask
-- and (b) feed the last few turns back into the model for continuity.
--
-- Kept lean: no message threading, no edits — if we need that later, we'll
-- add a thread_id column and a non-default value for legacy rows.

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_chat_messages_user_created
  on public.chat_messages (user_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "users read own chat messages" on public.chat_messages;
create policy "users read own chat messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own chat messages" on public.chat_messages;
create policy "users insert own chat messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "users delete own chat messages" on public.chat_messages;
create policy "users delete own chat messages"
  on public.chat_messages for delete
  using (auth.uid() = user_id);
