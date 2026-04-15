'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['산책', '등산', '여행', '사진', '요리', '음악', '서예', '탁구']

export default function NewGroupPage() {
  const supabase = createClient()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('산책')
  const [region, setRegion] = useState('')
  const [description, setDescription] = useState('')
  const [maxMembers, setMaxMembers] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.replace('/login')

      const { data: profile } = await supabase
        .from('profiles')
        .select('region')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (profile?.region) setRegion(profile.region)
      setReady(true)
    })()
  }, [router, supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) return setError('모임 이름을 입력해 주세요.')
    if (!region.trim()) return setError('지역을 입력해 주세요. (예: 서울 마포구)')
    if (maxMembers < 2) return setError('정원은 2명 이상이어야 해요.')

    setLoading(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) return router.replace('/login')

      const insertPayload = {
        title: title.trim(),
        category,
        region: region.trim(),
        description: description.trim(),
        max_members: maxMembers,
        owner_user_id: user.id,
      }

      const { data: created, error: insertError } = await supabase
        .from('groups')
        .insert(insertPayload)
        .select('id')
        .single()

      if (insertError) {
        console.error('[groups/new] insert failed', insertError, insertPayload)
        throw new Error(
          `[${insertError.code ?? '?'}] ${insertError.message}${
            insertError.details ? ` · ${insertError.details}` : ''
          }${insertError.hint ? ` · ${insertError.hint}` : ''}`,
        )
      }
      if (!created) throw new Error('모임 생성 결과를 확인할 수 없어요.')

      // DB 트리거가 owner를 group_members에 자동 추가할 수 있으므로
      // 이미 존재하면 무시하고, 없으면 추가한다.
      const { error: joinError } = await supabase
        .from('group_members')
        .upsert(
          { group_id: created.id, user_id: user.id, role: 'owner' },
          { onConflict: 'group_id,user_id', ignoreDuplicates: true },
        )
      if (joinError) {
        console.error('[groups/new] join failed', joinError)
        throw new Error(
          `[${joinError.code ?? '?'}] ${joinError.message}${
            joinError.details ? ` · ${joinError.details}` : ''
          }`,
        )
      }

      router.replace(`/groups/${created.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!ready) return <div style={{ padding: 24 }}>로딩 중...</div>

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <Link href="/groups" style={{ textDecoration: 'underline', color: '#57534e' }}>
        ← 모임 목록
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 700, marginTop: 16 }}>모임 만들기</h1>
      <p style={{ marginTop: 8, color: '#57534e', fontSize: 16 }}>
        관심사가 비슷한 분들과 함께할 모임을 만들어 보세요.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        <label style={{ display: 'block', marginTop: 16, fontSize: 16, fontWeight: 600 }}>
          모임 이름
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 10, border: '1px solid #d6d3d1' }}
          placeholder="예: 아침 산책 모임"
        />

        <label style={{ display: 'block', marginTop: 16, fontSize: 16, fontWeight: 600 }}>
          카테고리
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 10, border: '1px solid #d6d3d1' }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label style={{ display: 'block', marginTop: 16, fontSize: 16, fontWeight: 600 }}>
          지역(구/동)
        </label>
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 10, border: '1px solid #d6d3d1' }}
          placeholder="예: 서울 마포구"
        />

        <label style={{ display: 'block', marginTop: 16, fontSize: 16, fontWeight: 600 }}>
          모임 소개
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16, minHeight: 140, borderRadius: 10, border: '1px solid #d6d3d1' }}
          placeholder="어떤 모임인지 소개해 주세요."
        />

        <label style={{ display: 'block', marginTop: 16, fontSize: 16, fontWeight: 600 }}>
          정원
        </label>
        <input
          type="number"
          value={maxMembers}
          onChange={(e) => setMaxMembers(Number(e.target.value))}
          style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 10, border: '1px solid #d6d3d1' }}
          min={2}
          max={500}
        />

        {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}

        <button
          disabled={loading}
          style={{
            marginTop: 20,
            padding: '14px 16px',
            width: '100%',
            fontSize: 17,
            fontWeight: 700,
            borderRadius: 12,
            border: 'none',
            background: '#1c1917',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '생성 중...' : '모임 만들기'}
        </button>
      </form>
    </div>
  )
}
