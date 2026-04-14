-- ============================================================
-- SilverLink Visibility RLS
-- posts 공개범위(visibility)에 따른 SELECT 정책 강화
-- 20260414_full_schema.sql 실행 후 이 파일을 실행하세요.
-- ============================================================

-- 기존 posts SELECT 정책 제거
drop policy if exists "posts_select_own_or_public"   on posts;
drop policy if exists "posts_select_visibility"      on posts;
drop policy if exists "posts_select"                 on posts;
drop policy if exists "Authenticated users can view posts" on posts;

-- 공개범위 기반 posts SELECT 정책
-- 규칙:
--   private      → 본인만
--   friends      → 본인 또는 friendships 관계
--   interested   → 본인 또는 relationship_requests(양방향) 또는 friendships
--   same_group   → 본인 또는 공유 group_members
--   members      → 모든 인증 회원
-- 추가: 차단 관계가 있으면 어떤 공개범위도 접근 불가
create policy "posts_select_visibility" on posts
  for select
  using (
    -- 본인 피드는 항상 볼 수 있음
    auth.uid() = user_id

    or (
      -- 차단 관계가 없어야 함
      not exists (
        select 1 from blocks
        where
          (blocker_user_id = auth.uid() and blocked_user_id = posts.user_id)
          or (blocker_user_id = posts.user_id and blocked_user_id = auth.uid())
      )
      and (
        -- 전체 인증회원
        visibility = 'members'

        -- 1촌만: friendships 테이블에 존재
        or (
          visibility = 'friends'
          and exists (
            select 1 from friendships
            where
              user_low_id  = least(auth.uid(), posts.user_id)
              and user_high_id = greatest(auth.uid(), posts.user_id)
          )
        )

        -- 관심 있는 사람만: 상호 or 단방향 relationship_requests 또는 1촌
        or (
          visibility = 'interested'
          and (
            exists (
              select 1 from relationship_requests
              where requester_user_id = auth.uid() and target_user_id = posts.user_id
            )
            or exists (
              select 1 from relationship_requests
              where requester_user_id = posts.user_id and target_user_id = auth.uid()
            )
            or exists (
              select 1 from friendships
              where
                user_low_id  = least(auth.uid(), posts.user_id)
                and user_high_id = greatest(auth.uid(), posts.user_id)
            )
          )
        )

        -- 같은 모임 사람만: 공유 group_members
        or (
          visibility = 'same_group'
          and exists (
            select 1
            from group_members gm1
            join group_members gm2 on gm1.group_id = gm2.group_id
            where gm1.user_id = auth.uid() and gm2.user_id = posts.user_id
          )
        )
      )
    )
  );
