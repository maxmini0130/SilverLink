-- ============================================================
-- SilverLink Auth Trigger
-- 신규 가입 시 profiles 행 자동 생성
-- full_schema.sql 실행 후 이 파일을 실행하세요.
-- ============================================================

-- 신규 사용자 가입 시 호출될 함수
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- 기존 트리거 제거 후 재생성 (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
