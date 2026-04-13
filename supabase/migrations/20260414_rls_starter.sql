alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.relationship_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_authenticated'
  ) then
    create policy profiles_select_authenticated on public.profiles
      for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_manage_own'
  ) then
    create policy profiles_manage_own on public.profiles
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'posts' and policyname = 'posts_insert_own'
  ) then
    create policy posts_insert_own on public.posts
      for insert to authenticated with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'posts' and policyname = 'posts_update_delete_own'
  ) then
    create policy posts_update_delete_own on public.posts
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_reactions' and policyname = 'post_reactions_manage_own'
  ) then
    create policy post_reactions_manage_own on public.post_reactions
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'relationship_requests' and policyname = 'relationship_requests_manage_participants'
  ) then
    create policy relationship_requests_manage_participants on public.relationship_requests
      for all to authenticated
      using (auth.uid() in (requester_user_id, target_user_id))
      with check (auth.uid() = requester_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'friendships' and policyname = 'friendships_select_participants'
  ) then
    create policy friendships_select_participants on public.friendships
      for select to authenticated
      using (auth.uid() in (user_low_id, user_high_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'friendships' and policyname = 'friendships_insert_participants'
  ) then
    create policy friendships_insert_participants on public.friendships
      for insert to authenticated
      with check (auth.uid() in (user_low_id, user_high_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversation_members' and policyname = 'conversation_members_select_own'
  ) then
    create policy conversation_members_select_own on public.conversation_members
      for select to authenticated using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversation_members' and policyname = 'conversation_members_insert_participants'
  ) then
    create policy conversation_members_insert_participants on public.conversation_members
      for insert to authenticated with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_manage_own'
  ) then
    create policy messages_manage_own on public.messages
      for all to authenticated
      using (
        exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
        )
      )
      with check (
        auth.uid() = user_id and
        exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocks' and policyname = 'blocks_manage_own'
  ) then
    create policy blocks_manage_own on public.blocks
      for all to authenticated
      using (auth.uid() = blocker_user_id)
      with check (auth.uid() = blocker_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reports' and policyname = 'reports_insert_own'
  ) then
    create policy reports_insert_own on public.reports
      for insert to authenticated with check (auth.uid() = reporter_user_id);
  end if;
end $$;
