-- ============================================================
-- SilverLink: groups 테이블 구 RLS 정책 정리
-- 과거 수동 생성 정책(공백 포함 이름)이 남아 있어 신규 정책과
-- 충돌하므로 명시적으로 제거한다.
-- ============================================================

drop policy if exists "groups insert admin only"       on public.groups;
drop policy if exists "groups delete admin only"       on public.groups;
drop policy if exists "groups update admin only"       on public.groups;
drop policy if exists "groups selectable by authenticated" on public.groups;

-- SELECT 정책이 사라지면 안 되므로 재보장 (이미 있다면 무시됨)
drop policy if exists groups_select_authenticated on public.groups;
create policy groups_select_authenticated on public.groups
  for select to authenticated using (true);
