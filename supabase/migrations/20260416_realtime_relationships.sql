-- ============================================================
-- SilverLink: relationship_requests, friendships 테이블 Realtime 활성화
-- RelationshipActions 컴포넌트에서 상대방 관심/1촌 변경을
-- 실시간 구독하기 위해 supabase_realtime publication에 추가.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'relationship_requests'
  ) then
    execute 'alter publication supabase_realtime add table public.relationship_requests';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'friendships'
  ) then
    execute 'alter publication supabase_realtime add table public.friendships';
  end if;
end $$;
