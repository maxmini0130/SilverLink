'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['산책', '등산', '여행', '사진', '요리', '음악', '서예', '탁구']

export default function AdminGroupsPage() {
  const supabase = useMemo(() => createClient(), [])
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

      const { data, error: adminError } = await supabase
        .from('app_admins')
        .select('user_id')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (adminError) {
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
    if (!region.trim()) return setError('지역을 입력해 주세요. 예: 서울 마포구')
    if (maxMembers < 2) return setError('정원은 2명 이상이어야 해요.')

    setLoading(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) return router.replace('/login')

      const { error: insertError } = await supabase.from('groups').insert({
        title: title.trim(),
        category,
        region: region.trim(),
        description: description.trim(),
        max_members: maxMembers,
        owner_user_id: user.id,
      })

      if (insertError) throw insertError

      router.replace('/groups')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '생성에 실패했습니다.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (isAdmin === null) return <div className="page" style={{ color: 'var(--muted)' }}>로딩 중...</div>

  if (!isAdmin) {
    return (
      <div className="page">
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>관리자 전용</h1>
        <p style={{ marginTop: 8, color: 'var(--muted)' }}>이 페이지는 관리자만 접근할 수 있어요.</p>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>모임 만들기</h1>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginTop: 16 }}>모임 이름</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 아침 산책 모임"
        />

        <label style={{ display: 'block', marginTop: 16 }}>카테고리</label>
        <select
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label style={{ display: 'block', marginTop: 16 }}>지역</label>
        <input
          className="input"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="예: 서울 마포구"
        />

        <label style={{ display: 'block', marginTop: 16 }}>설명</label>
        <textarea
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: 120 }}
          placeholder="모임 소개를 적어주세요."
        />

        <label style={{ display: 'block', marginTop: 16 }}>정원</label>
        <input
          className="input"
          type="number"
          value={maxMembers}
          onChange={(e) => setMaxMembers(Number(e.target.value))}
          min={2}
        />

        {error && <p className="error-text">{error}</p>}

        <button className="btn-primary" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? '생성 중...' : '모임 만들기'}
        </button>
      </form>
    </div>
  )
}
