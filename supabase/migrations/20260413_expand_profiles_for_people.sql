alter table public.profiles
  add column if not exists relationship_purpose text,
  add column if not exists bio text,
  add column if not exists avatar_url text;
