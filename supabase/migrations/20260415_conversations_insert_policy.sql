-- ============================================================
-- SilverLink: conversations INSERT 정책 보정
-- 앱은 conversations를 먼저 생성한 뒤 conversation_members를 추가하는
-- 구조라 INSERT 단계에서는 참여자 체크가 불가능하다. 인증 사용자면 허용.
-- ============================================================

drop policy if exists conversations_insert_authenticated on public.conversations;
drop policy if exists "conversations insert authenticated" on public.conversations;

create policy conversations_insert_authenticated on public.conversations
  for insert to authenticated
  with check (true);
