-- ============================================================
-- SilverLink: 일반 사용자도 모임 생성 허용
-- 기존 groups_insert_admin 정책을 확장하여 인증 사용자가 본인을
-- owner로 지정한 경우 생성을 허용한다. 관리자는 그대로 허용.
-- ============================================================

drop policy if exists groups_insert_admin      on public.groups;
drop policy if exists groups_insert_authed     on public.groups;
drop policy if exists groups_update_admin      on public.groups;
drop policy if exists groups_update_owner      on public.groups;

-- 인증 사용자는 본인을 owner로 지정한 모임을 만들 수 있음
create policy groups_insert_authed on public.groups
  for insert to authenticated
  with check (owner_user_id = auth.uid());

-- 관리자 또는 소유자가 모임 정보 수정 가능
create policy groups_update_owner on public.groups
  for update to authenticated
  using (
    owner_user_id = auth.uid()
    or exists (select 1 from public.app_admins where user_id = auth.uid())
  )
  with check (
    owner_user_id = auth.uid()
    or exists (select 1 from public.app_admins where user_id = auth.uid())
  );
