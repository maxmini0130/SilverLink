-- ============================================================
-- SilverLink Storage Setup
-- Supabase SQL Editor에서 full_schema.sql 실행 후 이 파일을 실행하세요.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Storage 버킷 생성
-- ────────────────────────────────────────────────────────────

-- 프로필 사진 버킷 (공개)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 피드 이미지 버킷 (공개)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  10485760,  -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ────────────────────────────────────────────────────────────
-- 2. Storage RLS 정책
-- ────────────────────────────────────────────────────────────

-- [avatars] 기존 정책 제거
drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_upload_own"    on storage.objects;
drop policy if exists "avatars_update_own"    on storage.objects;
drop policy if exists "avatars_delete_own"    on storage.objects;
-- [post-images] 기존 정책 제거
drop policy if exists "post_images_public_read"  on storage.objects;
drop policy if exists "post_images_upload_own"   on storage.objects;
drop policy if exists "post_images_delete_own"   on storage.objects;

-- [avatars] 누구나 읽기 가능 (공개 버킷)
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- [avatars] 본인 폴더에만 업로드 가능 ({user_id}/filename)
create policy "avatars_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- [avatars] 본인 파일만 덮어쓰기 가능
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- [avatars] 본인 파일만 삭제 가능
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- [post-images] 누구나 읽기 가능
create policy "post_images_public_read" on storage.objects
  for select using (bucket_id = 'post-images');

-- [post-images] 본인 폴더에만 업로드 가능
create policy "post_images_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-images' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- [post-images] 본인 파일만 삭제 가능
create policy "post_images_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-images' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
