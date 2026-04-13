alter table public.profiles
  add column if not exists default_post_visibility text not null default 'members';

alter table public.profiles
  drop constraint if exists profiles_default_post_visibility_check;

alter table public.profiles
  add constraint profiles_default_post_visibility_check
  check (default_post_visibility in ('private', 'friends', 'interested', 'same_group', 'members'));

create table if not exists public.blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

create table if not exists public.reports (
  id bigserial primary key,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  message_id bigint references public.messages(id) on delete set null,
  reason text not null,
  detail text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  check (status in ('open', 'in_review', 'closed'))
);

create index if not exists blocks_blocked_idx
  on public.blocks (blocked_user_id, created_at desc);

create index if not exists reports_status_idx
  on public.reports (status, created_at desc);
