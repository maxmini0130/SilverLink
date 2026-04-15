'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'

type GroupRow = {
  id: string
  title: string
  category: string
  region: string
  description: string
  max_members: number
  owner_user_id: string
}

export default function GroupDetailPage() {
  const supabase = createClient()
  const params = useParams<{ id: string }>()
  const groupId = useMemo(() => params.id, [params.id])

  const [group, setGroup] = useState<GroupRow | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [memberCount, setMemberCount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setError(null)
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) return
      setCurrentUserId(user.id)

      const { data: g, error: gerr } = await supabase
        .from('groups')
        .select('id,title,category,region,description,max_members,owner_user_id')
        .eq('id', groupId)
        .maybeSingle()

      if (gerr) setError(gerr.message)
      setGroup((g as GroupRow) ?? null)

      const [memRes, countRes] = await Promise.all([
        supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', groupId),
      ])

      setIsMember(!!memRes.data)
      setMemberCount(countRes.count ?? 0)
      setLoading(false)
    })()
  }, [groupId, supabase])

  async function join() {
    if (!group || !currentUserId) return
    if (memberCount >= group.max_members) {
      setError('정원이 가득 찼어요.')
      return
    }

    setError(null)
    setBusy(true)
    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: currentUserId,
      role: 'member',
    })
    setBusy(false)

    if (error) return setError(error.message)
    setIsMember(true)
    setMemberCount((prev) => prev + 1)
  }

  async function leave() {
    if (!currentUserId || !group) return
    if (group.owner_user_id === currentUserId) {
      setError('모임장은 모임을 나갈 수 없어요.')
      return
    }
    if (typeof window !== 'undefined' && !window.confirm('이 모임에서 나가시겠어요?')) return

    setError(null)
    setBusy(true)
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)
    setBusy(false)

    if (error) return setError(error.message)
    setIsMember(false)
    setMemberCount((prev) => Math.max(0, prev - 1))
  }

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error && !group) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>
  if (!group) return <div style={{ padding: 24 }}>모임을 찾을 수 없어요.</div>

  const isOwner = group.owner_user_id === currentUserId
  const isFull = memberCount >= group.max_members

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Link href="/groups" style={{ textDecoration: 'underline', color: '#57534e' }}>
        ← 모임 목록
      </Link>

      <section
        style={{
          marginTop: 16,
          padding: 24,
          borderRadius: 20,
          border: '1px solid #e7e5e4',
          background: '#fff',
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>{group.title}</h1>
        <div style={{ marginTop: 10, color: '#57534e', fontSize: 16 }}>
          {group.category} · {group.region}
        </div>
        <div style={{ marginTop: 6, color: '#57534e', fontSize: 15 }}>
          참여 {memberCount} / 정원 {group.max_members}명
          {isOwner && <span style={{ marginLeft: 8, color: '#1c1917', fontWeight: 700 }}>· 내가 만든 모임</span>}
        </div>

        {group.description && (
          <p style={{ marginTop: 16, fontSize: 16, color: '#1c1917', whiteSpace: 'pre-wrap' }}>
            {group.description}
          </p>
        )}

        {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}

        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isMember ? (
            <>
              <Link
                href={`/groups/${groupId}/chat`}
                style={{
                  padding: '12px 18px',
                  borderRadius: 12,
                  background: '#1c1917',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                채팅방 들어가기
              </Link>
              {!isOwner && (
                <button
                  type="button"
                  onClick={() => void leave()}
                  disabled={busy}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 12,
                    background: '#fff',
                    color: '#1c1917',
                    border: '1px solid #d6d3d1',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: busy ? 'not-allowed' : 'pointer',
                  }}
                >
                  모임 나가기
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => void join()}
              disabled={busy || isFull}
              style={{
                padding: '12px 18px',
                borderRadius: 12,
                background: isFull ? '#d6d3d1' : '#1c1917',
                color: '#fff',
                border: 'none',
                fontSize: 16,
                fontWeight: 700,
                cursor: busy || isFull ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? '처리 중...' : isFull ? '정원 마감' : '참여하기'}
            </button>
          )}
        </div>
      </section>

      <AppNav />
    </div>
  )
}
