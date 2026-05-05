-- Return counterpart user ids for every block relationship involving auth.uid().
-- This lets server-rendered screens hide both "I blocked them" and "they blocked me"
-- without exposing raw block rows to ordinary clients.

create or replace function public.get_blocked_user_ids()
returns table(user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or to_regclass('public.blocks') is null then
    return;
  end if;

  return query execute
    'select
       case
         when b.blocker_id = auth.uid() then b.blocked_id
         else b.blocker_id
       end as user_id
     from public.blocks b
     where b.blocker_id = auth.uid() or b.blocked_id = auth.uid()';
end;
$$;

revoke all on function public.get_blocked_user_ids() from public;
grant execute on function public.get_blocked_user_ids() to authenticated;
