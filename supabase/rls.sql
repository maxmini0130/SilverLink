-- ================================================================
-- SilverLink MVP — RLS (Row Level Security) 정책
--
-- 실행 순서: schema.sql 이후 실행
--
-- 핵심 원칙:
--   - 모든 권한 제어는 DB 레벨에서 강제
--   - 프론트 필터링만으로는 절대 보안 보장 불가
--   - 차단(blocks)은 양방향으로 피드/프로필 모두 차단
-- ================================================================

-- ── 관리자 체크 헬퍼 ─────────────────────────────────────────
-- 각 정책에서 반복 사용. 인라인 서브쿼리로 작성.
-- is_admin: EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())

-- ── 차단 체크 헬퍼 ───────────────────────────────────────────
-- is_blocked(target_id):
--   EXISTS (SELECT 1 FROM blocks
--     WHERE (blocker_id = auth.uid() AND blocked_id = target_id)
--        OR (blocker_id = target_id  AND blocked_id = auth.uid()))


-- ================================================================
-- app_admins
-- ================================================================

ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;

-- 관리자 목록은 관리자만 조회
CREATE POLICY "app_admins: 관리자만 조회"
  ON app_admins FOR SELECT
  USING (EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()));


-- ================================================================
-- profiles
-- ================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: 인증 회원 전체 조회 가능 (단, 차단 관계 제외)
CREATE POLICY "profiles: 인증회원 조회 (차단 제외)"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- 내 프로필은 항상 조회 가능
      id = auth.uid()
      OR
      -- 차단하지 않은 사용자
      NOT EXISTS (
        SELECT 1 FROM blocks
        WHERE (blocker_id = auth.uid() AND blocked_id = profiles.id)
           OR (blocker_id = profiles.id AND blocked_id = auth.uid())
      )
    )
  );

-- INSERT: 본인 프로필만 생성 가능
CREATE POLICY "profiles: 본인만 생성"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: 본인 프로필만 수정 가능
CREATE POLICY "profiles: 본인만 수정"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ================================================================
-- interests (관심사 마스터)
-- ================================================================

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- SELECT: 인증 회원 전체 조회
CREATE POLICY "interests: 인증회원 조회"
  ON interests FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE: 관리자만
CREATE POLICY "interests: 관리자만 수정"
  ON interests FOR ALL
  USING (EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()));


-- ================================================================
-- profile_interests
-- ================================================================

ALTER TABLE profile_interests ENABLE ROW LEVEL SECURITY;

-- SELECT: 내 관심사 + 차단되지 않은 사용자의 관심사
CREATE POLICY "profile_interests: 조회"
  ON profile_interests FOR SELECT
  USING (
    profile_id = auth.uid()
    OR NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = profile_interests.profile_id)
         OR (blocker_id = profile_interests.profile_id AND blocked_id = auth.uid())
    )
  );

-- INSERT/DELETE: 본인 것만
CREATE POLICY "profile_interests: 본인만 추가"
  ON profile_interests FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "profile_interests: 본인만 삭제"
  ON profile_interests FOR DELETE
  USING (profile_id = auth.uid());


-- ================================================================
-- posts (생활 피드)
-- 가장 복잡한 정책 — can_view_post() 헬퍼 함수 사용
-- ================================================================

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- SELECT: 공개범위 + 차단 정책 적용
CREATE POLICY "posts: 공개범위 기반 조회"
  ON posts FOR SELECT
  USING (
    deleted_at IS NULL
    AND can_view_post(author_id, visibility)
  );

-- INSERT: 본인 게시물만 작성
CREATE POLICY "posts: 본인만 작성"
  ON posts FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- UPDATE: 본인 게시물만 수정 (soft delete 포함)
CREATE POLICY "posts: 본인만 수정"
  ON posts FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- DELETE: 실제 삭제는 불가 (soft delete만 허용 — UPDATE로 처리)
-- 관리자 하드 삭제용
CREATE POLICY "posts: 관리자 삭제"
  ON posts FOR DELETE
  USING (EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()));


-- ================================================================
-- post_reactions
-- ================================================================

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT: 볼 수 있는 게시물의 반응만 조회
CREATE POLICY "post_reactions: 조회"
  ON post_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_reactions.post_id
        AND p.deleted_at IS NULL
        AND can_view_post(p.author_id, p.visibility)
    )
  );

-- INSERT: 인증 회원이 볼 수 있는 게시물에 반응
CREATE POLICY "post_reactions: 반응 추가"
  ON post_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_reactions.post_id
        AND p.deleted_at IS NULL
        AND p.reaction_enabled = true
        AND can_view_post(p.author_id, p.visibility)
    )
  );

-- DELETE: 본인 반응만 취소
CREATE POLICY "post_reactions: 본인 반응 취소"
  ON post_reactions FOR DELETE
  USING (user_id = auth.uid());


-- ================================================================
-- relationship_requests (관심 보내기)
-- ================================================================

ALTER TABLE relationship_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: 보낸 사람 또는 받은 사람만 조회
CREATE POLICY "relationship_requests: 당사자만 조회"
  ON relationship_requests FOR SELECT
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
  );

-- INSERT: 본인이 보낸 관심만 등록 (자기 자신 제외는 CHECK 제약으로)
CREATE POLICY "relationship_requests: 관심 보내기"
  ON relationship_requests FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- DELETE: 보낸 관심만 취소 가능
CREATE POLICY "relationship_requests: 관심 취소"
  ON relationship_requests FOR DELETE
  USING (sender_id = auth.uid());


-- ================================================================
-- friendships (1촌 관계)
-- ================================================================

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: 당사자만 조회
CREATE POLICY "friendships: 당사자만 조회"
  ON friendships FOR SELECT
  USING (
    requester_id = auth.uid()
    OR addressee_id = auth.uid()
  );

-- INSERT: 1촌 신청 (requester = 본인)
CREATE POLICY "friendships: 1촌 신청"
  ON friendships FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- UPDATE: 수락은 addressee만, 상태 변경만 허용
CREATE POLICY "friendships: 1촌 수락"
  ON friendships FOR UPDATE
  USING (addressee_id = auth.uid())
  WITH CHECK (addressee_id = auth.uid());

-- DELETE: 당사자 중 누구든 1촌 해제 가능
CREATE POLICY "friendships: 1촌 해제"
  ON friendships FOR DELETE
  USING (
    requester_id = auth.uid()
    OR addressee_id = auth.uid()
  );


-- ================================================================
-- conversations (대화방)
-- ================================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- SELECT: 내가 속한 대화방 조회 (모임 채팅방은 모임 멤버도 조회 가능)
CREATE POLICY "conversations: 멤버만 조회"
  ON conversations FOR SELECT
  USING (
    -- 대화방 멤버 (DM 및 이미 입장한 모임 채팅)
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_id = conversations.id
        AND user_id = auth.uid()
    )
    OR (
      -- 모임 채팅방: 모임 멤버이면 채팅방 조회 가능 (입장/참여 찾기 목적)
      type = 'group'
      AND EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = conversations.group_id
          AND user_id = auth.uid()
      )
    )
  );

-- INSERT: 인증 회원 생성 가능 (서버 액션에서 조건 검증)
CREATE POLICY "conversations: 생성"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- ================================================================
-- conversation_members
-- ================================================================

ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

-- SELECT: 내 멤버십 또는 같은 대화방 멤버
CREATE POLICY "conversation_members: 조회"
  ON conversation_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_members cm2
      WHERE cm2.conversation_id = conversation_members.conversation_id
        AND cm2.user_id = auth.uid()
    )
  );

-- INSERT: 인증 회원 (조건은 서버 레이어에서 검증)
CREATE POLICY "conversation_members: 추가"
  ON conversation_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: 본인의 last_read_at만 수정
CREATE POLICY "conversation_members: 읽음 처리"
  ON conversation_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ================================================================
-- messages
-- ================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- SELECT: 대화방 멤버만 조회 (삭제된 메시지 제외)
CREATE POLICY "messages: 멤버만 조회"
  ON messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- INSERT: 대화방 멤버만 전송 (sender = 본인)
CREATE POLICY "messages: 멤버만 전송"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- UPDATE: 본인 메시지 soft delete (deleted_at 설정)
CREATE POLICY "messages: 본인 메시지 삭제"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());


-- ================================================================
-- groups (모임)
-- ================================================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- SELECT: 전체 인증 회원 조회 가능
CREATE POLICY "groups: 인증회원 조회"
  ON groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: 관리자만 생성 (MVP: 운영자가 모임 생성)
CREATE POLICY "groups: 관리자만 생성"
  ON groups FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- UPDATE: 관리자 또는 모임 주최자
CREATE POLICY "groups: 관리자/주최자 수정"
  ON groups FOR UPDATE
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );


-- ================================================================
-- group_members (모임 참여자)
-- ================================================================

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- SELECT: 인증 회원 전체 조회 (모임 상세에서 참여자 목록 표시)
CREATE POLICY "group_members: 인증회원 조회"
  ON group_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: 인증 회원이 직접 참여 (user_id = 본인)
CREATE POLICY "group_members: 참여하기"
  ON group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- DELETE: 본인 탈퇴 또는 주최자 강퇴
CREATE POLICY "group_members: 탈퇴/강퇴"
  ON group_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE id = group_members.group_id
        AND owner_user_id = auth.uid()
    )
  );


-- ================================================================
-- reports (신고)
-- ================================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- SELECT: 관리자만 조회
CREATE POLICY "reports: 관리자만 조회"
  ON reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()));

-- INSERT: 인증 회원 신고 (reporter = 본인)
CREATE POLICY "reports: 신고 접수"
  ON reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- UPDATE: 관리자만 상태 변경
CREATE POLICY "reports: 관리자 상태 변경"
  ON reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()));


-- ================================================================
-- blocks (차단)
-- ================================================================

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- SELECT: 내가 차단한 목록만 조회 (피차단자는 자신이 차단됐는지 알 수 없음)
CREATE POLICY "blocks: 본인 차단 목록만 조회"
  ON blocks FOR SELECT
  USING (blocker_id = auth.uid());

-- INSERT: 본인이 차단
CREATE POLICY "blocks: 차단하기"
  ON blocks FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

-- DELETE: 본인이 차단 해제
CREATE POLICY "blocks: 차단 해제"
  ON blocks FOR DELETE
  USING (blocker_id = auth.uid());


-- ================================================================
-- Supabase Realtime 활성화
-- (Supabase 대시보드 > Database > Replication에서도 설정 가능)
-- ================================================================

-- 모임 채팅 실시간 수신용
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;
