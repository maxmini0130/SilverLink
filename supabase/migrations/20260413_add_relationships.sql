create table if not exists public.relationship_requests (
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (requester_user_id, target_user_id),
  check (requester_user_id <> target_user_id)
);

create table if not exists public.friendships (
  user_low_id uuid not null references auth.users(id) on delete cascade,
  user_high_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low_id, user_high_id),
  check (user_low_id < user_high_id)
);

create index if not exists relationship_requests_target_idx
  on public.relationship_requests (target_user_id, created_at desc);

create index if not exists friendships_high_idx
  on public.friendships (user_high_id, created_at desc);
