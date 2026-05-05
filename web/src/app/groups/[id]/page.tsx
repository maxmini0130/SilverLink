'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  const supabase = useMemo(() => createClient(), [])
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const groupId = useMemo(() => params.id, [params.id])

  const [group, setGroup] = useState<GroupRow | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setError(null)
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) {
        router.push('/login')
        return
      }

      setMyId(user.id)

      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id,title,category,region,description,max_members,owner_user_id')
        .eq('id', groupId)
        .maybeSingle()

      if (groupError || !groupData) {
        setError(groupError?.message ?? '모임을 찾을 수 없어요.')
        setLoading(false)
        return
      }
      setGroup(groupData as GroupRow)

      const { data: member } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()

      setIsMember(!!member)

      const { count } = await supabase
        .from('group_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('group_id', groupId)

      setMemberCount(count ?? 0)
      setLoading(false)
    })()
  }, [groupId, router, supabase])

  async function join() {
    setActionLoading(true)
    setError(null)
    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    })
    const json = await res.json()
    setActionLoading(false)
    if (!res.ok) {
      setError(json.error ?? '참여에 실패했어요.')
      return
    }
    setIsMember(true)
    setMemberCount((count) => count + 1)
  }

  async function leave() {
    if (!myId) return
    if (!confirm('모임에서 나가시겠어요?')) return
    setActionLoading(true)
    const { error: err } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', myId)
    setActionLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setIsMember(false)
    setMemberCount((count) => Math.max(0, count - 1))
  }

  if (loading) return <div className="page" style={{ color: 'var(--muted)' }}>로딩 중...</div>
  if (error && !group) return <div className="page" style={{ color: '#dc2626' }}>{error}</div>
  if (!group) return <div className="page" style={{ color: 'var(--muted)' }}>모임을 찾을 수 없어요.</div>

  const isOwner = myId === group.owner_user_id

  return (
    <div className="page" style={{ maxWidth: 480, paddingBottom: 100 }}>
      <Link href="/groups" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--muted)', fontSize: 16, marginBottom: 20, textDecoration: 'none' }}>
        모임 목록
      </Link>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{group.title}</h1>
          {isOwner && (
            <span style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 999, padding: '3px 10px', fontSize: 13, fontWeight: 700 }}>
              모임장
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ background: '#eff6ff', color: 'var(--primary)', borderRadius: 999, padding: '4px 12px', fontSize: 15 }}>
            {group.category}
          </span>
          <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 999, padding: '4px 12px', fontSize: 15 }}>
            {group.region}
          </span>
          <span style={{ background: '#f9fafb', color: 'var(--muted)', borderRadius: 999, padding: '4px 12px', fontSize: 15 }}>
            {memberCount} / {group.max_members}명
          </span>
        </div>
        {group.description && <p style={{ fontSize: 16, lineHeight: 1.7, color: '#444', margin: 0 }}>{group.description}</p>}
      </div>

      {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isMember ? (
          <>
            <Link href={`/groups/${groupId}/chat`} className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
              대화방 들어가기
            </Link>
            {!isOwner && (
              <button className="btn-outline" onClick={leave} disabled={actionLoading} style={{ color: '#dc2626', borderColor: '#dc2626' }}>
                {actionLoading ? '처리 중...' : '모임 나가기'}
              </button>
            )}
          </>
        ) : (
          <button className="btn-primary" onClick={join} disabled={actionLoading || memberCount >= group.max_members}>
            {actionLoading ? '참여 중...' : memberCount >= group.max_members ? '정원이 찼어요' : '모임 참여하기'}
          </button>
        )}
      </div>
    </div>
  )
}
