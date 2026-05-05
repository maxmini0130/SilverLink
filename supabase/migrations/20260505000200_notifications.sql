-- WithDay notifications
-- Idempotent for databases where a partial notifications table already exists.

create table if not exists public.notifications (
  id bigint generated always as identity primary key
);

alter table public.notifications
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade,
  add column if not exists actor_id uuid references auth.users(id) on delete set null,
  add column if not exists type text,
  add column if not exists title text,
  add column if not exists body text default '',
  add column if not exists href text default '/',
  add column if not exists read_at timestamptz,
  add column if not exists created_at timestamptz default now();

do $$ begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'user_id'
  ) then
    execute 'update public.notifications set recipient_id = user_id where recipient_id is null and user_id is not null';
  end if;
end $$;

update public.notifications set title = 'Notification' where title is null;
update public.notifications set type = 'message' where type is null;
update public.notifications set body = '' where body is null;
update public.notifications set href = '/' where href is null;
update public.notifications set created_at = now() where created_at is null;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  alter column type set not null,
  alter column title set not null,
  alter column body set default '',
  alter column href set default '/',
  alter column created_at set default now();

alter table public.notifications enable row level security;

do $$ begin
  create policy "notifications_select_own" on public.notifications
    for select using (auth.uid() = recipient_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "notifications_insert_authenticated" on public.notifications
    for insert with check (
      auth.uid() is not null
      and auth.uid() = actor_id
      and recipient_id <> auth.uid()
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "notifications_update_own" on public.notifications
    for update using (auth.uid() = recipient_id)
    with check (auth.uid() = recipient_id);
exception when duplicate_object then null; end $$;

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_id, read_at)
  where read_at is null;
