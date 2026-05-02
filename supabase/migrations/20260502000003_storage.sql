-- WithDay Storage: 프로필 사진 + 피드 이미지
-- 실행 전 Supabase 대시보드에서 버킷 2개를 먼저 생성해야 합니다:
--   - 버킷명: avatars    (Public: ON)
--   - 버킷명: post-images (Public: ON)

-- =====================
-- DB 컬럼 추가
-- =====================
alter table profiles add column if not exists avatar_url text;
alter table posts    add column if not exists image_url  text;

-- =====================
-- Storage RLS 정책: avatars
-- =====================
do $$ begin
  create policy "avatars_public_read" on storage.objects
    for select using (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "avatars_auth_insert" on storage.objects
    for insert with check (
      bucket_id = 'avatars'
      and auth.uid() is not null
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "avatars_owner_update" on storage.objects
    for update using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "avatars_owner_delete" on storage.objects
    for delete using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

-- =====================
-- Storage RLS 정책: post-images
-- =====================
do $$ begin
  create policy "post_images_public_read" on storage.objects
    for select using (bucket_id = 'post-images');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "post_images_auth_insert" on storage.objects
    for insert with check (
      bucket_id = 'post-images'
      and auth.uid() is not null
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "post_images_owner_delete" on storage.objects
    for delete using (
      bucket_id = 'post-images'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;
