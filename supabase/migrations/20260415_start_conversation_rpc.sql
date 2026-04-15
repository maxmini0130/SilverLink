-- ============================================================
-- SilverLink: start_conversation RPC
-- conversations INSERT 직후 RETURNING이 SELECT RLS에 걸리는 문제를
-- 원자적 SECURITY DEFINER 함수로 회피.
-- 호출자는 두 사용자가 이미 자격(상호 관심/1촌/같은 모임)을
-- 만족했음을 앱 레이어에서 검증한 뒤 이 함수를 호출해야 한다.
-- ============================================================

create or replace function public.start_direct_conversation(target uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing_id uuid;
  new_id uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if target is null or target = me then
    raise exception 'invalid target';
  end if;

  -- 이미 두 사람이 참여 중인 direct 대화가 있는지 확인
  select c.id
    into existing_id
  from public.conversations c
  join public.conversation_members cm_me on cm_me.conversation_id = c.id and cm_me.user_id = me
  join public.conversation_members cm_tgt on cm_tgt.conversation_id = c.id and cm_tgt.user_id = target
  where c.kind = 'direct'
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations (kind) values ('direct')
    returning id into new_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (new_id, me), (new_id, target);

  return new_id;
end;
$$;

grant execute on function public.start_direct_conversation(uuid) to authenticated;
