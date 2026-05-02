'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AvatarUpload from '@/components/AvatarUpload'

const AGE_BANDS = ['60-64', '65-69', '70-74', '75-79', '80+'] as const
const HOBBIES = ['산책', '등산', '여행', '사진', '요리', '음악', '서예', '탁구'] as const

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [ageBand, setAgeBand] = useState<(typeof AGE_BANDS)[number]>('60-64')
  const [region, setRegion] = useState('')
  const [hobbies, setHobbies] = useState<string[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 이미 프로필 있으면 홈으로
  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.replace('/login')

      setUserId(auth.user.id)

      const { data } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (data) router.replace('/')
    })()
  }, [router, supabase])

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
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      })

      if (error) throw error

      await supabase.from('events').insert({
        user_id: user.id,
        event_type: 'profile_completed',
        payload: { nickname: nickname.trim(), region: region.trim(), hobbies },
      })

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

      {userId && (
        <div style={{ marginTop: 20, marginBottom: 8 }}>
          <AvatarUpload
            userId={userId}
            currentUrl={avatarUrl}
            nickname={nickname || '?'}
            onUploaded={(url) => setAvatarUrl(url)}
            skipDbUpdate
          />
        </div>
      )}

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

        {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}

        <button disabled={loading} style={{ marginTop: 16, padding: 12, width: '100%' }}>
          {loading ? '저장 중...' : '저장하고 시작하기'}
        </button>
      </form>
    </div>
  )
}