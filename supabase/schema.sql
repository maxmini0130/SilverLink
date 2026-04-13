-- ================================================================
-- SilverLink MVP — Database Schema
-- Supabase (PostgreSQL 15+) 기준
--
-- 실행 순서:
--   1. schema.sql  ← 이 파일
--   2. rls.sql
--   3. seed.sql
--
-- ⚠️  주의: 기존 테이블이 있는 경우 DROP 후 재실행 필요
--         프로덕션 적용 시 마이그레이션 방식으로 변환할 것
-- ================================================================

-- ================================================================
-- 0. 기존 오브젝트 초기화 (재실행 안전)
-- ================================================================

-- 기존 함수 제거
DROP FUNCTION IF EXISTS can_view_post(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_last_message_at() CASCADE;
DROP FUNCTION IF EXISTS check_group_capacity() CASCADE;

-- 기존 타입 제거 (테이블 의존성 때문에 테이블 먼저 DROP)
DROP TABLE IF EXISTS
  blocks, reports, group_members, groups,
  messages, conversation_members, conversations,
  friendships, relationship_requests,
  post_reactions, posts,
  profile_interests, interests,
  profiles, app_admins
CASCADE;

DROP TYPE IF EXISTS
  visibility_level, age_band, relationship_purpose,
  reaction_type, friendship_status, conversation_type,
  group_role, report_target_type, report_reason, report_status
CASCADE;


-- ================================================================
-- 1. ENUM 타입
-- ================================================================

-- 게시물 공개범위
CREATE TYPE visibility_level AS ENUM (
  'only_me',      -- 나만 보기
  'friends_only', -- 1촌만 보기
  'interested',   -- 관심 있는 사람만 보기
  'same_group',   -- 같은 모임 사람만 보기
  'all_members'   -- 전체 인증회원
);

-- 나이대
CREATE TYPE age_band AS ENUM (
  '50s_late',   -- 50대 후반
  '60s_early',  -- 60대 초반 (60~64)
  '60s_late',   -- 60대 후반 (65~69)
  '70s_early',  -- 70대 초반 (70~74)
  '70s_late',   -- 70대 후반 (75~79)
  '80s_plus'    -- 80대 이상
);

-- 관계 목적
CREATE TYPE relationship_purpose AS ENUM (
  'friend',     -- 친구
  'companion',  -- 말벗
  'activity',   -- 동행
  'hobby'       -- 취미공유
);

-- 피드 반응 종류
CREATE TYPE reaction_type AS ENUM (
  'like',           -- 좋아요
  'hello',          -- 반가워요
  'similar_hobby',  -- 취미가 비슷해요
  'want_to_go'      -- 같이 가보고 싶어요
);

-- 1촌 관계 상태
CREATE TYPE friendship_status AS ENUM (
  'pending',   -- 신청 중
  'accepted'   -- 1촌 완료
);

-- 대화방 종류
CREATE TYPE conversation_type AS ENUM (
  'direct',  -- 1:1 DM
  'group'    -- 모임 채팅
);

-- 모임 내 역할
CREATE TYPE group_role AS ENUM (
  'owner',   -- 주최자
  'member'   -- 참여자
);

-- 신고 대상 종류
CREATE TYPE report_target_type AS ENUM (
  'user',    -- 사용자
  'post',    -- 게시물
  'message'  -- 메시지
);

-- 신고 사유
CREATE TYPE report_reason AS ENUM (
  'spam',     -- 스팸/광고
  'fraud',    -- 사기/금전요구
  'sexual',   -- 성적 불쾌감
  'hate',     -- 혐오/비하
  'other'     -- 기타
);

-- 신고 처리 상태
CREATE TYPE report_status AS ENUM (
  'open',       -- 접수됨
  'in_review',  -- 검토 중
  'closed'      -- 처리 완료
);


-- ================================================================
-- 2. 테이블 정의
-- ================================================================

-- ── 관리자 ────────────────────────────────────────────────────

CREATE TABLE app_admins (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app_admins IS '서비스 관리자 목록. RLS admin 체크에 사용.';


-- ── 프로필 ────────────────────────────────────────────────────

CREATE TABLE profiles (
  -- auth.users와 1:1 대응
  id                  uuid             PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 기본 정보
  nickname            text             NOT NULL CHECK (char_length(nickname) BETWEEN 2 AND 10),
  age_band            age_band         NOT NULL,
  gender              text             CHECK (gender IN ('male', 'female', 'prefer_not_to_say')),

  -- 지역
  region_city         text             NOT NULL DEFAULT '',  -- 시/도
  region_district     text             NOT NULL DEFAULT '',  -- 구/동

  -- 관계 목적 (복수 선택)
  purposes            relationship_purpose[]  NOT NULL DEFAULT '{}',

  -- 관심사 (MVP: text 배열로 직접 저장. 추후 profile_interests로 마이그레이션)
  hobbies             text[]           NOT NULL DEFAULT '{}',

  -- 자기소개
  bio                 text             NOT NULL DEFAULT '' CHECK (char_length(bio) <= 150),

  -- 프로필 사진 (Supabase Storage 'avatars' 버킷 경로)
  avatar_url          text,

  -- 피드 기본 공개범위
  default_visibility  visibility_level NOT NULL DEFAULT 'all_members',

  -- 온보딩 완료 여부
  is_onboarded        boolean          NOT NULL DEFAULT false,

  created_at          timestamptz      NOT NULL DEFAULT now(),
  updated_at          timestamptz      NOT NULL DEFAULT now()
);

COMMENT ON COLUMN profiles.hobbies IS 'MVP 임시 컬럼. 추후 profile_interests 테이블로 마이그레이션 예정.';


-- ── 관심사 마스터 ──────────────────────────────────────────────

CREATE TABLE interests (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text    NOT NULL UNIQUE,
  category    text,                         -- 추후 그룹핑 (운동/문화/취미)
  sort_order  int     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ── 프로필-관심사 연결 (N:M) ───────────────────────────────────

CREATE TABLE profile_interests (
  profile_id   uuid  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest_id  uuid  NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (profile_id, interest_id)
);


-- ── 생활 피드 ─────────────────────────────────────────────────

CREATE TABLE posts (
  id                uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         uuid             NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content           text             NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200),
  image_url         text             NOT NULL,  -- 사진 필수
  visibility        visibility_level NOT NULL,
  reaction_enabled  boolean          NOT NULL DEFAULT true,
  created_at        timestamptz      NOT NULL DEFAULT now(),
  deleted_at        timestamptz      -- soft delete
);


-- ── 피드 반응 ─────────────────────────────────────────────────

CREATE TABLE post_reactions (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id        uuid          NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id        uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type  reaction_type NOT NULL,
  created_at     timestamptz   NOT NULL DEFAULT now(),

  -- 같은 반응 중복 방지 (취소 후 재반응은 가능)
  UNIQUE (post_id, user_id, reaction_type)
);


-- ── 관심 보내기 (단방향) ──────────────────────────────────────

CREATE TABLE relationship_requests (
  sender_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (sender_id, receiver_id),
  CHECK (sender_id <> receiver_id)
);

COMMENT ON TABLE relationship_requests IS
  '단방향 관심. (A→B) AND (B→A) 행이 모두 존재하면 상호관심.';


-- ── 1촌 관계 ──────────────────────────────────────────────────

CREATE TABLE friendships (
  id            uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id  uuid              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        friendship_status NOT NULL DEFAULT 'pending',
  created_at    timestamptz       NOT NULL DEFAULT now(),
  accepted_at   timestamptz,

  CHECK (requester_id <> addressee_id)
);

-- 동일 쌍 중복 신청 방지 (A→B, B→A 를 같은 쌍으로 처리)
CREATE UNIQUE INDEX idx_friendships_unique_pair
  ON friendships (
    LEAST(requester_id::text, addressee_id::text),
    GREATEST(requester_id::text, addressee_id::text)
  );


-- ── 대화방 ────────────────────────────────────────────────────

CREATE TABLE conversations (
  id               uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  type             conversation_type NOT NULL,
  -- group 타입일 때만 group_id 존재
  group_id         uuid              REFERENCES groups(id) ON DELETE CASCADE,
  last_message_at  timestamptz,
  created_at       timestamptz       NOT NULL DEFAULT now(),

  CONSTRAINT chk_conversation_group
    CHECK (
      (type = 'group'  AND group_id IS NOT NULL) OR
      (type = 'direct' AND group_id IS NULL)
    )
);


-- ── 대화방 멤버 ───────────────────────────────────────────────

CREATE TABLE conversation_members (
  conversation_id  uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at        timestamptz NOT NULL DEFAULT now(),
  last_read_at     timestamptz NOT NULL DEFAULT now(),  -- 안읽은 메시지 기준

  PRIMARY KEY (conversation_id, user_id)
);


-- ── 메시지 ────────────────────────────────────────────────────

CREATE TABLE messages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content          text        NOT NULL CHECK (char_length(content) >= 1),
  created_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz  -- soft delete
);


-- ── 모임 ──────────────────────────────────────────────────────

CREATE TABLE groups (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL CHECK (char_length(title) >= 2),
  description      text        NOT NULL DEFAULT '',
  category         text,                             -- 관심사 카테고리
  region_city      text        NOT NULL DEFAULT '',
  region_district  text        NOT NULL DEFAULT '',
  schedule_date    date,
  schedule_time    time,
  location         text,                             -- 모임 장소 (텍스트)
  max_members      int         NOT NULL DEFAULT 20 CHECK (max_members > 0),
  owner_user_id    uuid        NOT NULL REFERENCES profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);


-- ── 모임 멤버 ─────────────────────────────────────────────────

CREATE TABLE group_members (
  group_id   uuid       NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    uuid       NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       group_role NOT NULL DEFAULT 'member',
  joined_at  timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (group_id, user_id)
);


-- ── 신고 ──────────────────────────────────────────────────────

CREATE TABLE reports (
  id                uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id       uuid               NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id  uuid               NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type       report_target_type NOT NULL,
  target_id         uuid               NOT NULL,  -- 신고 대상 리소스 ID (FK 없음)
  reason            report_reason      NOT NULL,
  detail            text               NOT NULL DEFAULT '',
  status            report_status      NOT NULL DEFAULT 'open',
  created_at        timestamptz        NOT NULL DEFAULT now(),
  resolved_at       timestamptz,

  CHECK (reporter_id <> reported_user_id)
);


-- ── 차단 ──────────────────────────────────────────────────────

CREATE TABLE blocks (
  blocker_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);


-- ================================================================
-- 3. 인덱스
-- ================================================================

-- profiles
CREATE INDEX idx_profiles_region
  ON profiles(region_city, region_district);
CREATE INDEX idx_profiles_is_onboarded
  ON profiles(is_onboarded)
  WHERE is_onboarded = false;

-- profile_interests
CREATE INDEX idx_profile_interests_interest_id
  ON profile_interests(interest_id);

-- posts (활성 게시물 + 최신순)
CREATE INDEX idx_posts_author_active
  ON posts(author_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_created_at
  ON posts(created_at DESC)
  WHERE deleted_at IS NULL;

-- post_reactions
CREATE INDEX idx_post_reactions_post_id
  ON post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id
  ON post_reactions(user_id);

-- relationship_requests
CREATE INDEX idx_relationship_requests_receiver_id
  ON relationship_requests(receiver_id);

-- friendships
CREATE INDEX idx_friendships_requester_id  ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee_id  ON friendships(addressee_id);
CREATE INDEX idx_friendships_status        ON friendships(status);

-- conversations
CREATE INDEX idx_conversations_last_message_at
  ON conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_group_id
  ON conversations(group_id);

-- conversation_members
CREATE INDEX idx_conversation_members_user_id
  ON conversation_members(user_id);

-- messages (대화방 내 시간순 — 가장 핵심 쿼리 패턴)
CREATE INDEX idx_messages_conversation_created
  ON messages(conversation_id, created_at ASC)
  WHERE deleted_at IS NULL;

-- groups
CREATE INDEX idx_groups_region     ON groups(region_city, region_district);
CREATE INDEX idx_groups_category   ON groups(category);
CREATE INDEX idx_groups_schedule   ON groups(schedule_date);

-- group_members
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- reports
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_status           ON reports(status);
CREATE INDEX idx_reports_created_at       ON reports(created_at DESC);

-- blocks
CREATE INDEX idx_blocks_blocked_id ON blocks(blocked_id);


-- ================================================================
-- 4. 함수 & 트리거
-- ================================================================

-- ── updated_at 자동 갱신 ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── conversations.last_message_at 자동 갱신 ──────────────────

CREATE OR REPLACE FUNCTION update_conversation_last_message_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message_at();


-- ── 모임 정원 초과 방지 ───────────────────────────────────────

CREATE OR REPLACE FUNCTION check_group_capacity()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  current_count int;
  max_count     int;
BEGIN
  SELECT COUNT(*)   INTO current_count FROM group_members WHERE group_id = NEW.group_id;
  SELECT max_members INTO max_count    FROM groups         WHERE id = NEW.group_id;

  IF current_count >= max_count THEN
    RAISE EXCEPTION '모임 정원이 초과되었습니다. (현재: %, 최대: %)', current_count, max_count;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_group_capacity
  BEFORE INSERT ON group_members
  FOR EACH ROW EXECUTE FUNCTION check_group_capacity();


-- ── 게시물 공개범위 판단 헬퍼 함수 ───────────────────────────
-- RLS 정책에서 사용. SECURITY DEFINER로 실행해 내부 테이블 접근 보장.

CREATE OR REPLACE FUNCTION can_view_post(
  post_author_id  uuid,
  post_visibility visibility_level
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- 1. 내 게시물은 항상 조회 가능
  IF post_author_id = auth.uid() THEN
    RETURN true;
  END IF;

  -- 2. 차단 관계 확인 (양방향)
  IF EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = post_author_id)
       OR (blocker_id = post_author_id AND blocked_id = auth.uid())
  ) THEN
    RETURN false;
  END IF;

  -- 3. 공개범위별 판단
  CASE post_visibility
    WHEN 'all_members' THEN
      RETURN true;

    WHEN 'friends_only' THEN
      RETURN EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
          AND (
            (requester_id = auth.uid() AND addressee_id = post_author_id) OR
            (requester_id = post_author_id AND addressee_id = auth.uid())
          )
      );

    WHEN 'interested' THEN
      -- 상호관심: 양방향 relationship_requests 존재
      RETURN (
        EXISTS (SELECT 1 FROM relationship_requests WHERE sender_id = auth.uid()     AND receiver_id = post_author_id) AND
        EXISTS (SELECT 1 FROM relationship_requests WHERE sender_id = post_author_id AND receiver_id = auth.uid())
      );

    WHEN 'same_group' THEN
      RETURN EXISTS (
        SELECT 1
        FROM group_members gm1
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid()
          AND gm2.user_id = post_author_id
      );

    WHEN 'only_me' THEN
      -- 본인만 가능 (이미 위에서 처리됨)
      RETURN false;

    ELSE
      RETURN false;
  END CASE;
END;
$$;
