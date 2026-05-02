-- SilverLink Safe Migration (idempotent)
-- 기존 테이블/정책이 있어도 안전하게 실행됩니다.

-- =====================
-- TYPES
-- =====================
do $$ begin
  create type post_visibility as enum ('all', 'friends', 'same_group');
exception when duplicate_object then null; end $$;

do $$ begin
  create type relationship_status as enum ('pending', 'accepted', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('pending', 'reviewed', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

-- =====================
-- 신규 테이블 전체 DROP (이전 마이그레이션 잔재 제거)
-- 데이터가 없는 테이블이므로 안전하게 재생성
-- =====================
drop table if exists events cascade;
drop table if exists reports cascade;
drop table if exists blocks cascade;
drop table if exists direct_messages cascade;
drop table if exists conversations cascade;
drop table if exists friendships cascade;
drop table if exists relationship_requests cascade;
drop table if exists post_reactions cascade;
drop table if exists posts cascade;
drop table if exists mood_logs cascade;

-- =====================
-- APP ADMINS (먼저 생성 — groups 정책이 참조)
-- =====================
create table if not exists app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
alter table app_admins enable row level security;

do $$ begin
  create policy "관리자 확인" on app_admins for select using (true);
exception when duplicate_object then null; end $$;

-- =====================
-- PROFILES
-- =====================
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  age_band text not null,
  region text not null,
  hobbies text[] default '{}',
  bio text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- bio 컬럼이 없는 기존 테이블 대응
alter table profiles add column if not exists bio text default '';
alter table profiles add column if not exists updated_at timestamptz default now();
alter table profiles enable row level security;

do $$ begin
  create policy "누구나 프로필 조회" on profiles for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 프로필 수정" on profiles for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 프로필 삽입" on profiles for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- =====================
-- MOOD LOGS
-- =====================
create table mood_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mood_score smallint not null check (mood_score between 1 and 5),
  log_date date not null default current_date,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);
alter table mood_logs enable row level security;

do $$ begin
  create policy "본인 기분 조회" on mood_logs for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인 기분 삽입" on mood_logs for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인 기분 수정" on mood_logs for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- =====================
-- POSTS
-- =====================
create table posts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) <= 1000),
  visibility post_visibility default 'all',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table posts enable row level security;

do $$ begin
  create policy "공개 게시글 조회" on posts for select using (visibility = 'all' or auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 게시글 작성" on posts for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 게시글 수정" on posts for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 게시글 삭제" on posts for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- =====================
-- POST REACTIONS
-- =====================
create table post_reactions (
  id bigint generated always as identity primary key,
  post_id bigint not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null default 'like',
  created_at timestamptz default now(),
  unique (post_id, user_id, reaction_type)
);
alter table post_reactions enable row level security;

do $$ begin
  create policy "누구나 반응 조회" on post_reactions for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 반응 추가" on post_reactions for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 반응 삭제" on post_reactions for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- =====================
-- RELATIONSHIP REQUESTS
-- =====================
create table relationship_requests (
  id bigint generated always as identity primary key,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status relationship_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (from_user_id, to_user_id)
);
alter table relationship_requests enable row level security;

create policy "관련 유저 조회" on relationship_requests for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "본인만 요청 생성" on relationship_requests for insert
  with check (auth.uid() = from_user_id);
create policy "수신자만 상태 변경" on relationship_requests for update
  using (auth.uid() = to_user_id);

-- =====================
-- FRIENDSHIPS
-- =====================
create table friendships (
  id bigint generated always as identity primary key,
  user_id_a uuid not null references auth.users(id) on delete cascade,
  user_id_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id_a, user_id_b),
  check (user_id_a < user_id_b)
);
alter table friendships enable row level security;

do $$ begin
  create policy "관련 유저 1촌 조회" on friendships for select
    using (auth.uid() = user_id_a or auth.uid() = user_id_b);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "시스템만 1촌 생성" on friendships for insert
    with check (auth.uid() = user_id_a or auth.uid() = user_id_b);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "관련 유저 1촌 삭제" on friendships for delete
    using (auth.uid() = user_id_a or auth.uid() = user_id_b);
exception when duplicate_object then null; end $$;

-- =====================
-- CONVERSATIONS
-- =====================
create table conversations (
  id bigint generated always as identity primary key,
  user_id_a uuid not null references auth.users(id) on delete cascade,
  user_id_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  last_message_at timestamptz default now(),
  unique (user_id_a, user_id_b),
  check (user_id_a < user_id_b)
);
alter table conversations enable row level security;

do $$ begin
  create policy "참여자 대화 조회" on conversations for select
    using (auth.uid() = user_id_a or auth.uid() = user_id_b);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "참여자 대화 생성" on conversations for insert
    with check (auth.uid() = user_id_a or auth.uid() = user_id_b);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "참여자 대화 수정" on conversations for update
    using (auth.uid() = user_id_a or auth.uid() = user_id_b);
exception when duplicate_object then null; end $$;

-- =====================
-- DIRECT MESSAGES
-- =====================
create table direct_messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) <= 2000),
  created_at timestamptz default now()
);
alter table direct_messages enable row level security;

do $$ begin
  create policy "대화 참여자 메시지 조회" on direct_messages for select
    using (
      exists (
        select 1 from conversations c
        where c.id = conversation_id
          and (c.user_id_a = auth.uid() or c.user_id_b = auth.uid())
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 메시지 전송" on direct_messages for insert
    with check (auth.uid() = sender_id);
exception when duplicate_object then null; end $$;

-- =====================
-- GROUPS
-- =====================
create table if not exists groups (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null,
  region text not null,
  description text default '',
  max_members int not null default 30,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
alter table groups enable row level security;

do $$ begin
  create policy "누구나 그룹 조회" on groups for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "관리자만 그룹 생성" on groups for insert
    with check (exists (select 1 from app_admins where user_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "오너만 그룹 수정" on groups for update using (auth.uid() = owner_user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "오너만 그룹 삭제" on groups for delete using (auth.uid() = owner_user_id);
exception when duplicate_object then null; end $$;

-- =====================
-- GROUP MEMBERS
-- =====================
create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);
alter table group_members enable row level security;

do $$ begin
  create policy "누구나 멤버 조회" on group_members for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 가입" on group_members for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 탈퇴" on group_members for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- =====================
-- GROUP MESSAGES
-- =====================
create table if not exists group_messages (
  id bigint generated always as identity primary key,
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) <= 2000),
  created_at timestamptz default now()
);
alter table group_messages enable row level security;

do $$ begin
  create policy "멤버만 메시지 조회" on group_messages for select
    using (exists (
      select 1 from group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "멤버만 메시지 전송" on group_messages for insert
    with check (
      auth.uid() = user_id and
      exists (
        select 1 from group_members gm
        where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- =====================
-- BLOCKS
-- =====================
create table blocks (
  id bigint generated always as identity primary key,
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (blocker_id, blocked_id)
);
alter table blocks enable row level security;

do $$ begin
  create policy "본인 차단 목록 조회" on blocks for select using (auth.uid() = blocker_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 차단 추가" on blocks for insert with check (auth.uid() = blocker_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 차단 해제" on blocks for delete using (auth.uid() = blocker_id);
exception when duplicate_object then null; end $$;

-- =====================
-- REPORTS
-- =====================
create table reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  detail text default '',
  status report_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table reports enable row level security;

do $$ begin
  create policy "본인 신고 조회" on reports for select using (auth.uid() = reporter_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "관리자 모든 신고 조회" on reports for select
    using (exists (select 1 from app_admins where user_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "본인만 신고 생성" on reports for insert with check (auth.uid() = reporter_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "관리자만 신고 수정" on reports for update
    using (exists (select 1 from app_admins where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- =====================
-- EVENTS
-- =====================
create table events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb default '{}',
  created_at timestamptz default now()
);
alter table events enable row level security;

do $$ begin
  create policy "관리자만 이벤트 조회" on events for select
    using (exists (select 1 from app_admins where user_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "시스템 이벤트 삽입" on events for insert with check (true);
exception when duplicate_object then null; end $$;

-- =====================
-- REALTIME 활성화
-- =====================
do $$ begin
  alter publication supabase_realtime add table group_messages;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table direct_messages;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table relationship_requests;
exception when others then null; end $$;
