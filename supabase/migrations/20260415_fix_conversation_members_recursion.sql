-- ============================================================
-- SilverLink: conversation_members RLS 무한 재귀 수정
-- 기존 정책이 USING 절에서 같은 테이블을 셀프 조회하여 Postgres
-- 가 "infinite recursion detected in policy" 에러를 낸다.
-- SECURITY DEFINER 헬퍼 함수를 통해 RLS를 우회한 서브쿼리로 변경.
-- ============================================================

-- 현재 사용자가 속한 conversation_id 목록을 반환
create or replace function public.user_conversation_ids(uid uuid)
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select conversation_id
  from public.conversation_members
  where user_id = uid;
$$;

-- authenticated 역할이 호출할 수 있도록 권한 부여
grant execute on function public.user_conversation_ids(uuid) to authenticated;

-- 기존 재귀 정책 교체
drop policy if exists conversation_members_select_participant on public.conversation_members;
drop policy if exists conversation_members_select_own         on public.conversation_members;

create policy conversation_members_select_participant on public.conversation_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or conversation_id in (select public.user_conversation_ids(auth.uid()))
  );

-- conversations 정책도 같은 함수를 쓰도록 정리 (선택적, 기존 정책이 recursion은 아니지만 일관성)
drop policy if exists conversations_select_member  on public.conversations;
drop policy if exists conversations_update_member  on public.conversations;

create policy conversations_select_member on public.conversations
  for select to authenticated
  using (id in (select public.user_conversation_ids(auth.uid())));

create policy conversations_update_member on public.conversations
  for update to authenticated
  using (id in (select public.user_conversation_ids(auth.uid())))
  with check (id in (select public.user_conversation_ids(auth.uid())));

-- messages 정책도 동일하게 정리
drop policy if exists messages_select_member on public.messages;
drop policy if exists messages_insert_member on public.messages;

create policy messages_select_member on public.messages
  for select to authenticated
  using (conversation_id in (select public.user_conversation_ids(auth.uid())));

create policy messages_insert_member on public.messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and conversation_id in (select public.user_conversation_ids(auth.uid()))
  );
