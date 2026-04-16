'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminGroupsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('산책')
  const [region, setRegion] = useState('')
  const [description, setDescription] = useState('')
  const [maxMembers, setMaxMembers] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.replace('/login')

      // 관리자 확인
      const { data, error } = await supabase
        .from('app_admins')
        .select('user_id')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (error) {
        setIsAdmin(false)
        return
      }
      setIsAdmin(!!data)
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

      const { error } = await supabase.from('groups').insert({
        title: title.trim(),
        category,
        region: region.trim(),
        description: description.trim(),
        max_members: maxMembers,
        owner_user_id: user.id,
      })

      if (error) throw error

      // 생성 후 모임 리스트로 이동
      router.replace('/groups')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '생성에 실패했습니다.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (isAdmin === null) return <div style={{ padding: 24 }}>로딩 중...</div>

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>관리자 전용</h1>
        <p style={{ marginTop: 8 }}>이 페이지는 관리자만 접근할 수 있어요.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>모임 생성(관리자)</h1>
        <Link href="/admin/reports" style={{ textDecoration: 'underline', color: '#57534e' }}>
          신고 관리
        </Link>
      </div>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginTop: 16 }}>모임 이름</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16 }}
          placeholder="예: 아침 산책 모임"
        />

        <label style={{ display: 'block', marginTop: 16 }}>카테고리</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16 }}
        >
          {['산책', '등산', '여행', '사진', '요리', '음악', '서예', '탁구'].map((c) => (
            <option key={c} value={c}>
              {c}
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

        <label style={{ display: 'block', marginTop: 16 }}>설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16, minHeight: 120 }}
          placeholder="모임 소개를 적어주세요."
        />

        <label style={{ display: 'block', marginTop: 16 }}>정원</label>
        <input
          type="number"
          value={maxMembers}
          onChange={(e) => setMaxMembers(Number(e.target.value))}
          style={{ width: '100%', padding: 12, fontSize: 16 }}
          min={2}
        />

        {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}

        <button disabled={loading} style={{ marginTop: 16, padding: 12, width: '100%' }}>
          {loading ? '생성 중...' : '모임 만들기'}
        </button>
      </form>
    </div>
  )
}
