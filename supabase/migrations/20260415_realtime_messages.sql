-- ============================================================
-- SilverLink: messages 테이블 Realtime 활성화
-- supabase_realtime publication에 messages 추가하여
-- 클라이언트 postgres_changes 구독이 동작하도록 함.
-- ============================================================

-- 이미 등록되어 있으면 에러 나므로 안전하게 감싸기
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;

-- UPDATE/DELETE 이벤트까지 보내려면 REPLICA IDENTITY FULL 필요 (선택)
-- MVP에서는 INSERT만 구독하므로 기본값 사용.
