-- ============================================================
-- SilverLink Full Schema Migration (통합 실행용)
-- Supabase SQL Editor에 전체 복사 후 실행하세요.
-- 모든 구문이 idempotent(중복 실행 안전)합니다.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. 기본 테이블 생성
-- ────────────────────────────────────────────────────────────

-- profiles (Supabase Auth 가입 시 자동 생성되므로 if not exists)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  age_band text,
  region text,
  hobbies text[] default '{}',
  relationship_purpose text,
  bio text,
  avatar_url text,
  default_post_visibility text not null default 'members',
  created_at timestamptz not null default now()
);

-- profiles 컬럼 추가 (이미 있으면 무시)
alter table public.profiles add column if not exists relationship_purpose text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists default_post_visibility text not null default 'members';
alter table public.profiles drop constraint if exists profiles_default_post_visibility_check;
alter table public.profiles add constraint profiles_default_post_visibility_check
  check (default_post_visibility in ('private', 'friends', 'interested', 'same_group', 'members'));

-- groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  region text not null,
  description text,
  max_members int not null default 30,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- group_members
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- group_messages
create table if not exists public.group_messages (
  id bigserial primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

-- app_admins
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- relationship_requests
create table if not exists public.relationship_requests (
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (requester_user_id, target_user_id),
  check (requester_user_id <> target_user_id)
);

-- friendships
create table if not exists public.friendships (
  user_low_id uuid not null references auth.users(id) on delete cascade,
  user_high_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low_id, user_high_id),
  check (user_low_id < user_high_id)
);

-- conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- conversation_members
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- messages
create table if not exists public.messages (
  id bigserial primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

-- posts
create table if not exists public.posts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text,
  content text,
  visibility text not null default 'members',
  created_at timestamptz not null default now(),
  check (visibility in ('private', 'friends', 'interested', 'same_group', 'members')),
  check (image_url is not null or content is not null)
);

-- post_reactions
create table if not exists public.post_reactions (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction_type)
);

-- blocks
create table if not exists public.blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

-- reports
create table if not exists public.reports (
  id bigserial primary key,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  message_id bigint references public.messages(id) on delete set null,
  reason text not null,
  detail text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  check (status in ('open', 'in_review', 'closed'))
);

-- ────────────────────────────────────────────────────────────
-- 2. 인덱스
-- ────────────────────────────────────────────────────────────

create index if not exists relationship_requests_target_idx
  on public.relationship_requests (target_user_id, created_at desc);
create index if not exists friendships_high_idx
  on public.friendships (user_high_id, created_at desc);
create index if not exists conversation_members_user_idx
  on public.conversation_members (user_id, created_at desc);
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);
create index if not exists posts_created_at_idx
  on public.posts (created_at desc);
create index if not exists posts_user_created_at_idx
  on public.posts (user_id, created_at desc);
create index if not exists post_reactions_post_idx
  on public.post_reactions (post_id, created_at desc);
create index if not exists blocks_blocked_idx
  on public.blocks (blocked_user_id, created_at desc);
create index if not exists reports_status_idx
  on public.reports (status, created_at desc);
create index if not exists group_messages_group_idx
  on public.group_messages (group_id, created_at desc);

-- ────────────────────────────────────────────────────────────
-- 3. RLS 활성화
-- ────────────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.groups            enable row level security;
alter table public.group_members     enable row level security;
alter table public.group_messages    enable row level security;
alter table public.app_admins        enable row level security;
alter table public.relationship_requests enable row level security;
alter table public.friendships       enable row level security;
alter table public.conversations     enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages          enable row level security;
alter table public.posts             enable row level security;
alter table public.post_reactions    enable row level security;
alter table public.blocks            enable row level security;
alter table public.reports           enable row level security;

-- ────────────────────────────────────────────────────────────
-- 4. 기존 정책 제거 (재적용을 위해)
-- ────────────────────────────────────────────────────────────

-- profiles
drop policy if exists profiles_select_authenticated       on public.profiles;
drop policy if exists profiles_manage_own                 on public.profiles;
-- groups
drop policy if exists groups_select_authenticated         on public.groups;
drop policy if exists groups_insert_admin                 on public.groups;
drop policy if exists groups_update_admin                 on public.groups;
-- group_members
drop policy if exists group_members_select_authenticated  on public.group_members;
drop policy if exists group_members_insert_own            on public.group_members;
drop policy if exists group_members_delete_own            on public.group_members;
-- group_messages
drop policy if exists group_messages_select_member        on public.group_messages;
drop policy if exists group_messages_insert_member        on public.group_messages;
-- app_admins
drop policy if exists app_admins_select_authenticated     on public.app_admins;
-- relationship_requests
drop policy if exists relationship_requests_manage_participants on public.relationship_requests;
drop policy if exists relationship_requests_select_participant  on public.relationship_requests;
drop policy if exists relationship_requests_insert_own          on public.relationship_requests;
drop policy if exists relationship_requests_delete_own          on public.relationship_requests;
-- friendships
drop policy if exists friendships_select_participants     on public.friendships;
drop policy if exists friendships_insert_participants     on public.friendships;
drop policy if exists friendships_delete_participants     on public.friendships;
-- conversations
drop policy if exists conversations_select_member         on public.conversations;
drop policy if exists conversations_insert_authenticated  on public.conversations;
drop policy if exists conversations_update_member         on public.conversations;
-- conversation_members
drop policy if exists conversation_members_select_own         on public.conversation_members;
drop policy if exists conversation_members_select_participant on public.conversation_members;
drop policy if exists conversation_members_insert_participants on public.conversation_members;
drop policy if exists conversation_members_insert_own         on public.conversation_members;
-- messages
drop policy if exists messages_manage_own                 on public.messages;
drop policy if exists messages_select_member              on public.messages;
drop policy if exists messages_insert_member              on public.messages;
-- posts
drop policy if exists posts_select_authenticated          on public.posts;
drop policy if exists posts_insert_own                    on public.posts;
drop policy if exists posts_update_delete_own             on public.posts;
drop policy if exists posts_update_own                    on public.posts;
drop policy if exists posts_delete_own                    on public.posts;
-- post_reactions
drop policy if exists post_reactions_manage_own                on public.post_reactions;
drop policy if exists post_reactions_select_authenticated      on public.post_reactions;
drop policy if exists post_reactions_insert_own                on public.post_reactions;
drop policy if exists post_reactions_delete_own                on public.post_reactions;
-- blocks
drop policy if exists blocks_manage_own                   on public.blocks;
drop policy if exists blocks_select_participant           on public.blocks;
drop policy if exists blocks_insert_own                   on public.blocks;
drop policy if exists blocks_delete_own                   on public.blocks;
-- reports
drop policy if exists reports_insert_own                  on public.reports;
drop policy if exists reports_select_admin                on public.reports;
drop policy if exists reports_update_admin                on public.reports;

-- ────────────────────────────────────────────────────────────
-- 5. RLS 정책 (완전판)
-- ────────────────────────────────────────────────────────────

-- [profiles]
-- 인증 회원은 모두 조회 가능 (공개범위는 앱 레이어에서 제어)
create policy profiles_select_authenticated on public.profiles
  for select to authenticated using (true);
-- 자신의 프로필만 생성/수정/삭제
create policy profiles_manage_own on public.profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- [groups]
create policy groups_select_authenticated on public.groups
  for select to authenticated using (true);
-- 관리자만 모임 생성/수정 가능
create policy groups_insert_admin on public.groups
  for insert to authenticated
  with check (exists (select 1 from public.app_admins where user_id = auth.uid()));
create policy groups_update_admin on public.groups
  for update to authenticated
  using (exists (select 1 from public.app_admins where user_id = auth.uid()));

-- [group_members]
create policy group_members_select_authenticated on public.group_members
  for select to authenticated using (true);
create policy group_members_insert_own on public.group_members
  for insert to authenticated with check (auth.uid() = user_id);
create policy group_members_delete_own on public.group_members
  for delete to authenticated using (auth.uid() = user_id);

-- [group_messages]
-- 모임 참여자만 조회 및 작성 가능
create policy group_messages_select_member on public.group_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id
        and gm.user_id = auth.uid()
    )
  );
create policy group_messages_insert_member on public.group_messages
  for insert to authenticated
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id
        and gm.user_id = auth.uid()
    )
  );

-- [app_admins]
create policy app_admins_select_authenticated on public.app_admins
  for select to authenticated using (true);

-- [relationship_requests]
-- 요청자/수신자 모두 조회 가능 (상호관심 판단에 필요)
create policy relationship_requests_select_participant on public.relationship_requests
  for select to authenticated
  using (auth.uid() in (requester_user_id, target_user_id));
create policy relationship_requests_insert_own on public.relationship_requests
  for insert to authenticated
  with check (auth.uid() = requester_user_id);
create policy relationship_requests_delete_own on public.relationship_requests
  for delete to authenticated
  using (auth.uid() = requester_user_id);

-- [friendships]
create policy friendships_select_participants on public.friendships
  for select to authenticated
  using (auth.uid() in (user_low_id, user_high_id));
create policy friendships_insert_participants on public.friendships
  for insert to authenticated
  with check (auth.uid() in (user_low_id, user_high_id));
create policy friendships_delete_participants on public.friendships
  for delete to authenticated
  using (auth.uid() in (user_low_id, user_high_id));

-- [conversations]
-- 대화 참여자만 조회/수정 가능
create policy conversations_select_member on public.conversations
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
        and cm.user_id = auth.uid()
    )
  );
-- 서버 액션에서 conversations 먼저 생성 후 members 추가하는 구조이므로 insert는 허용
create policy conversations_insert_authenticated on public.conversations
  for insert to authenticated with check (true);
create policy conversations_update_member on public.conversations
  for update to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
        and cm.user_id = auth.uid()
    )
  );

-- [conversation_members]
-- 같은 대화의 참여자 목록은 참여자 모두 조회 가능
create policy conversation_members_select_participant on public.conversation_members
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id
        and cm.user_id = auth.uid()
    )
  );
create policy conversation_members_insert_own on public.conversation_members
  for insert to authenticated with check (auth.uid() = user_id);

-- [messages]
-- 대화 참여자만 조회/작성 가능
create policy messages_select_member on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );
create policy messages_insert_member on public.messages
  for insert to authenticated
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );

-- [posts]
-- 공개범위 필터링은 앱 레이어에서 처리, DB는 인증 회원 전체 허용
create policy posts_select_authenticated on public.posts
  for select to authenticated using (true);
create policy posts_insert_own on public.posts
  for insert to authenticated with check (auth.uid() = user_id);
create policy posts_update_own on public.posts
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy posts_delete_own on public.posts
  for delete to authenticated using (auth.uid() = user_id);

-- [post_reactions]
-- 반응은 인증 회원 모두 조회 가능 (반응 수 표시에 필요)
create policy post_reactions_select_authenticated on public.post_reactions
  for select to authenticated using (true);
create policy post_reactions_insert_own on public.post_reactions
  for insert to authenticated with check (auth.uid() = user_id);
create policy post_reactions_delete_own on public.post_reactions
  for delete to authenticated using (auth.uid() = user_id);

-- [blocks]
-- 차단자/피차단자 모두 자신이 포함된 차단 행 조회 가능
-- (피드/대화에서 양방향 필터링 필요)
create policy blocks_select_participant on public.blocks
  for select to authenticated
  using (auth.uid() in (blocker_user_id, blocked_user_id));
create policy blocks_insert_own on public.blocks
  for insert to authenticated with check (auth.uid() = blocker_user_id);
create policy blocks_delete_own on public.blocks
  for delete to authenticated using (auth.uid() = blocker_user_id);

-- [reports]
-- 신고는 본인만 작성, 관리자만 조회/수정
create policy reports_insert_own on public.reports
  for insert to authenticated with check (auth.uid() = reporter_user_id);
create policy reports_select_admin on public.reports
  for select to authenticated
  using (exists (select 1 from public.app_admins where user_id = auth.uid()));
create policy reports_update_admin on public.reports
  for update to authenticated
  using (exists (select 1 from public.app_admins where user_id = auth.uid()));
