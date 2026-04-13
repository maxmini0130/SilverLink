-- ================================================================
-- SilverLink MVP — Seed Data
--
-- 실행 순서: schema.sql → rls.sql → 이 파일
-- ================================================================

-- ================================================================
-- interests 마스터 데이터
-- (프론트 onboarding.ts의 HOBBIES 상수와 name 값이 일치해야 함)
-- ================================================================

INSERT INTO interests (name, category, sort_order) VALUES
  -- 운동/활동
  ('산책',  '운동',  1),
  ('등산',  '운동',  2),
  ('탁구',  '운동',  3),

  -- 여행/외출
  ('여행',  '외출',  4),
  ('동행',  '외출',  5),

  -- 문화/취미
  ('사진',  '취미',  6),
  ('요리',  '취미',  7),
  ('음악',  '취미',  8),
  ('서예',  '취미',  9),
  ('독서',  '취미',  10),
  ('영화',  '취미',  11),
  ('원예',  '취미',  12),
  ('바둑',  '취미',  13)

ON CONFLICT (name) DO UPDATE
  SET
    category   = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;


-- ================================================================
-- (선택) 첫 관리자 계정 등록
-- Supabase Auth에서 계정 생성 후 UUID를 아래에 입력
-- ================================================================

-- ⚠️ 아래 UUID를 실제 관리자 계정 UUID로 교체 후 주석 해제

-- INSERT INTO app_admins (user_id) VALUES
--   ('00000000-0000-0000-0000-000000000000')
-- ON CONFLICT (user_id) DO NOTHING;


-- ================================================================
-- Storage 버킷 설정 안내
-- (SQL로 생성 불가 — Supabase 대시보드에서 직접 생성)
-- ================================================================

-- 1. Supabase 대시보드 > Storage > New bucket
--    - 버킷 이름: avatars
--    - Public bucket: ON (체크)
--    - File size limit: 5MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp
--
-- 2. Storage > avatars > Policies > New policy
--    - 인증 회원이 자신의 폴더(auth.uid()/)에만 업로드 가능
--
--    INSERT policy:
--      (bucket_id = 'avatars') AND
--      (storage.foldername(name))[1] = auth.uid()::text
--
--    SELECT policy (public read):
--      bucket_id = 'avatars'
