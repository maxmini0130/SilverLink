'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const AGE_BANDS = ['60-64', '65-69', '70-74', '75-79', '80+'] as const
const GENDERS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'none', label: '응답 안 함' },
] as const
const HOBBIES = ['산책', '등산', '여행', '사진', '요리', '음악', '서예', '탁구'] as const

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()

  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState<(typeof GENDERS)[number]['value']>('none')
  const [ageBand, setAgeBand] = useState<(typeof AGE_BANDS)[number]>('60-64')
  const [region, setRegion] = useState('')
  const [hobbies, setHobbies] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 이미 프로필 있으면 홈으로
  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.replace('/login')

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
        gender,
        age_band: ageBand,
        region: region.trim(),
        hobbies,
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
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>프로필 설정</h1>
      <p style={{ marginTop: 8, fontSize: 16, color: '#888' }}>처음 한 번만 입력하면 됩니다.</p>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginTop: 24, fontSize: 18, fontWeight: 600 }}>닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{ width: '100%', padding: 14, fontSize: 18, marginTop: 8, boxSizing: 'border-box' }}
          placeholder="예: 김철수"
        />

        <label style={{ display: 'block', marginTop: 24, fontSize: 18, fontWeight: 600 }}>성별</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {GENDERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGender(value)}
              style={{
                flex: 1,
                padding: '14px 0',
                fontSize: 17,
                borderRadius: 8,
                border: `2px solid ${gender === value ? '#4f46e5' : '#ccc'}`,
                background: gender === value ? '#4f46e5' : 'transparent',
                color: gender === value ? '#fff' : 'inherit',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <label style={{ display: 'block', marginTop: 24, fontSize: 18, fontWeight: 600 }}>연령대</label>
        <select
          value={ageBand}
          onChange={(e) =>
            setAgeBand(e.target.value as (typeof AGE_BANDS)[number])
          }
          style={{ width: '100%', padding: 14, fontSize: 18, marginTop: 8, boxSizing: 'border-box' }}
        >
          {AGE_BANDS.map((a) => (
            <option key={a} value={a}>
              {a}세
            </option>
          ))}
        </select>

        <label style={{ display: 'block', marginTop: 24, fontSize: 18, fontWeight: 600 }}>지역</label>
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={{ width: '100%', padding: 14, fontSize: 18, marginTop: 8, boxSizing: 'border-box' }}
          placeholder="예: 서울 마포구"
        />

        <div style={{ marginTop: 24, fontSize: 18, fontWeight: 600 }}>관심사 선택 (복수 가능)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {HOBBIES.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => toggleHobby(h)}
              style={{
                padding: '12px 18px',
                fontSize: 17,
                borderRadius: 999,
                border: `2px solid ${hobbies.includes(h) ? '#4f46e5' : '#ccc'}`,
                background: hobbies.includes(h) ? '#4f46e5' : 'transparent',
                color: hobbies.includes(h) ? '#fff' : 'inherit',
                cursor: 'pointer',
              }}
            >
              {h}
            </button>
          ))}
        </div>

        {error && <p style={{ color: 'crimson', marginTop: 16, fontSize: 16 }}>{error}</p>}

        <button
          disabled={loading}
          style={{
            marginTop: 32,
            padding: '16px 0',
            width: '100%',
            fontSize: 18,
            fontWeight: 700,
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '저장 중...' : '저장하고 시작하기'}
        </button>
      </form>
    </div>
  )
}