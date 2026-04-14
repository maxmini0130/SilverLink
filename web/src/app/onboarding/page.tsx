'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'

const AGE_BANDS = ['60-64', '65-69', '70-74', '75-79', '80+'] as const
const HOBBIES = ['산책', '등산', '여행', '사진', '요리', '음악', '서예', '탁구'] as const
const RELATIONSHIP_PURPOSES = ['말벗', '친구', '동네 산책', '취미 동행', '모임 찾기'] as const

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get('edit') === '1'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [nickname, setNickname] = useState('')
  const [ageBand, setAgeBand] = useState<(typeof AGE_BANDS)[number]>('60-64')
  const [region, setRegion] = useState('')
  const [hobbies, setHobbies] = useState<string[]>([])
  const [relationshipPurpose, setRelationshipPurpose] =
    useState<(typeof RELATIONSHIP_PURPOSES)[number]>('말벗')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [defaultPostVisibility, setDefaultPostVisibility] = useState('members')
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 이미 프로필 있으면 홈으로 (edit 모드 아닐 때)
  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.replace('/login')

      const { data } = await supabase
        .from('profiles')
        .select('user_id,nickname,age_band,region,hobbies,relationship_purpose,bio,avatar_url,default_post_visibility')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (data) {
        setNickname(data.nickname ?? '')
        setAgeBand(data.age_band ?? '60-64')
        setRegion(data.region ?? '')
        setHobbies(data.hobbies ?? [])
        setRelationshipPurpose(data.relationship_purpose ?? '말벗')
        setBio(data.bio ?? '')
        setAvatarUrl(data.avatar_url ?? '')
        setDefaultPostVisibility(data.default_post_visibility ?? 'members')
        if (!isEditMode) router.replace('/')
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  function toggleHobby(h: string) {
    setHobbies((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]))
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError(null)

    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) { router.replace('/login'); return }

      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/avatar.${ext}`

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path)

      setAvatarUrl(publicUrl)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '사진 업로드에 실패했습니다.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nickname.trim()) return setError('닉네임을 입력해 주세요.')
    if (!region.trim()) return setError('지역을 입력해 주세요. (예: 서울 마포구)')
    if (hobbies.length === 0) return setError('취미를 1개 이상 선택해 주세요.')

    setLoading(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) return router.replace('/login')

      const { error } = await supabase.from('profiles').upsert({
        user_id: user.id,
        nickname: nickname.trim(),
        age_band: ageBand,
        region: region.trim(),
        hobbies,
        relationship_purpose: relationshipPurpose,
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || null,
        default_post_visibility: defaultPostVisibility,
      })

      if (error) throw error
      router.replace('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>프로필 설정</h1>
      <p style={{ marginTop: 8, color: '#57534e' }}>
        {isEditMode
          ? '내 프로필과 기본 공개범위를 수정해 보세요.'
          : '사람 추천과 프로필 탐색에 쓰일 기본 정보를 입력해 주세요.'}
      </p>
      <AppNav />

      <form onSubmit={onSubmit}>

        {/* 프로필 사진 */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>프로필 사진</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="프로필 사진 미리보기"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  background: '#e7e5e4',
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#d6d3d1',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#1c1917',
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {nickname.slice(0, 1) || '나'}
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: '1px solid #d6d3d1',
                  background: '#fafaf9',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {uploadingAvatar ? '업로드 중...' : '사진 선택'}
              </button>
              <p style={{ marginTop: 6, color: '#78716c', fontSize: 13 }}>
                JPG, PNG, WEBP · 최대 5MB
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
        </div>

        <label style={{ display: 'block', marginTop: 20 }}>닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16 }}
          placeholder="예: 김철수"
        />

        <label style={{ display: 'block', marginTop: 16 }}>나이대</label>
        <select
          value={ageBand}
          onChange={(e) => setAgeBand(e.target.value as (typeof AGE_BANDS)[number])}
          style={{ width: '100%', padding: 12, fontSize: 16 }}
        >
          {AGE_BANDS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <label style={{ display: 'block', marginTop: 16 }}>지역(구/동)</label>
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16 }}
          placeholder="예: 서울 마포구"
        />

        <div style={{ marginTop: 16, fontWeight: 600 }}>취미 선택(복수)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {HOBBIES.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => toggleHobby(h)}
              style={{
                padding: '10px 12px',
                borderRadius: 999,
                border: '1px solid #d6d3d1',
                background: hobbies.includes(h) ? '#1c1917' : '#fafaf9',
                color: hobbies.includes(h) ? '#fff' : '#1c1917',
                fontWeight: 600,
              }}
            >
              {h}
            </button>
          ))}
        </div>

        <label style={{ display: 'block', marginTop: 16 }}>관계 목적</label>
        <select
          value={relationshipPurpose}
          onChange={(e) => setRelationshipPurpose(e.target.value as (typeof RELATIONSHIP_PURPOSES)[number])}
          style={{ width: '100%', padding: 12, fontSize: 16 }}
        >
          {RELATIONSHIP_PURPOSES.map((purpose) => (
            <option key={purpose} value={purpose}>{purpose}</option>
          ))}
        </select>

        <label style={{ display: 'block', marginTop: 16 }}>자기소개</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16, minHeight: 120 }}
          placeholder="예: 사진 찍기와 산책을 좋아하고, 편하게 이야기 나눌 분을 찾고 있어요."
        />

        <label style={{ display: 'block', marginTop: 16 }}>기본 공개범위</label>
        <select
          value={defaultPostVisibility}
          onChange={(e) => setDefaultPostVisibility(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16 }}
        >
          <option value="private">나만 보기</option>
          <option value="friends">1촌만 보기</option>
          <option value="interested">관심 있는 사람만 보기</option>
          <option value="same_group">같은 모임 사람만 보기</option>
          <option value="members">전체 인증회원 보기</option>
        </select>

        {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}

        <button
          disabled={loading || uploadingAvatar}
          style={{ marginTop: 20, padding: 14, width: '100%', fontSize: 16, fontWeight: 700 }}
        >
          {loading ? '저장 중...' : '저장하고 시작하기'}
        </button>
      </form>
    </div>
  )
}
