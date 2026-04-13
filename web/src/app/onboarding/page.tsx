'use client'

import { useEffect, useState } from 'react'
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
  const [error, setError] = useState<string | null>(null)

  // 이미 프로필 있으면 홈으로
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
  }, [isEditMode, router, supabase])

  function toggleHobby(h: string) {
    setHobbies((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]))
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
      const message =
      err instanceof Error ? err.message : '저장에 실패했습니다.'
      setError(message)
    }finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>프로필 설정</h1>
      <p style={{ marginTop: 8, color: '#57534e' }}>
        {isEditMode ? '내 프로필과 기본 공개범위를 수정해 보세요.' : '사람 추천과 프로필 탐색에 쓰일 기본 정보를 입력해 주세요.'}
      </p>
      <AppNav />

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginTop: 16 }}>닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16 }}
          placeholder="예: 김철수"
        />

        <label style={{ display: 'block', marginTop: 16 }}>나이대</label>
        <select
          value={ageBand}
          onChange={(e) =>
            setAgeBand(e.target.value as (typeof AGE_BANDS)[number])
          }
          style={{ width: '100%', padding: 12, fontSize: 16 }}
        >
          {AGE_BANDS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
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
                border: '1px solid #444',
                background: hobbies.includes(h) ? '#fff' : 'transparent',
                color: hobbies.includes(h) ? '#000' : '#fff',
              }}
            >
              {h}
            </button>
          ))}
        </div>

        <label style={{ display: 'block', marginTop: 16 }}>관계 목적</label>
        <select
          value={relationshipPurpose}
          onChange={(e) =>
            setRelationshipPurpose(e.target.value as (typeof RELATIONSHIP_PURPOSES)[number])
          }
          style={{ width: '100%', padding: 12, fontSize: 16 }}
        >
          {RELATIONSHIP_PURPOSES.map((purpose) => (
            <option key={purpose} value={purpose}>
              {purpose}
            </option>
          ))}
        </select>

        <label style={{ display: 'block', marginTop: 16 }}>자기소개</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16, minHeight: 120 }}
          placeholder="예: 사진 찍기와 산책을 좋아하고, 편하게 이야기 나눌 분을 찾고 있어요."
        />

        <label style={{ display: 'block', marginTop: 16 }}>프로필 사진 URL</label>
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16 }}
          placeholder="https://..."
        />
        <p style={{ marginTop: 8, color: '#78716c', fontSize: 14 }}>
          지금 단계에서는 사진 주소를 입력하는 방식으로 연결했습니다. 이후 Supabase Storage 업로드로 확장할 수 있어요.
        </p>

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

        <button disabled={loading} style={{ marginTop: 16, padding: 12, width: '100%' }}>
          {loading ? '저장 중...' : '저장하고 시작하기'}
        </button>
      </form>
    </div>
  )
}
