-- ============================================================
-- SilverLink: messages SELECT 정책을 Realtime 친화적으로 교체
-- 기존 `conversation_id in (select public.user_conversation_ids(...))`
-- 패턴이 Supabase Realtime RLS 평가기에서 브로드캐스트를 막는
-- 케이스가 보고되어 boolean helper 로 단순화한다.
-- ============================================================

create or replace function public.is_conversation_member(conv uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = conv
      and user_id = uid
  );
$$;

grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

drop policy if exists messages_select_member on public.messages;
drop policy if exists messages_insert_member on public.messages;

create policy messages_select_member on public.messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));

create policy messages_insert_member on public.messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_conversation_member(conversation_id, auth.uid())
  );
