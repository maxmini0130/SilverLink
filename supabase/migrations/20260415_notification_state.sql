-- ============================================================
-- SilverLink: 알림 읽음 상태 (단일 last_read_at 방식)
-- 사용자가 알림 페이지를 본 시점을 기록하고, 그보다 최근에
-- 생성된 이벤트를 "읽지 않음"으로 판별한다.
-- ============================================================

create table if not exists public.user_notification_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default 'epoch'::timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_notification_state enable row level security;

drop policy if exists user_notification_state_select_own on public.user_notification_state;
drop policy if exists user_notification_state_upsert_own on public.user_notification_state;
drop policy if exists user_notification_state_update_own on public.user_notification_state;

create policy user_notification_state_select_own on public.user_notification_state
  for select to authenticated
  using (auth.uid() = user_id);

create policy user_notification_state_upsert_own on public.user_notification_state
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy user_notification_state_update_own on public.user_notification_state
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
