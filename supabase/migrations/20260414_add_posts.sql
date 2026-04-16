create table if not exists public.posts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text,
  content text,
  visibility text not null default 'members',
  created_at timestamptz not null default now(),
  check (visibility in ('private', 'friends', 'interested', 'same_group', 'members')),
  check (image_url is not null or content is not null)
);

create table if not exists public.post_reactions (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction_type)
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

create index if not exists posts_user_created_at_idx
  on public.posts (user_id, created_at desc);

create index if not exists post_reactions_post_idx
  on public.post_reactions (post_id, created_at desc);
