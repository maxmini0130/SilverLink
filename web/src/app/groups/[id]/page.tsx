'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
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
  const supabase = createClient()
  const params = useParams<{ id: string }>()
  const groupId = useMemo(() => params.id, [params.id])

  const [group, setGroup] = useState<GroupRow | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setError(null)
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) return

      const { data: g, error: gerr } = await supabase
        .from('groups')
        .select('id,title,category,region,description,max_members,owner_user_id')
        .eq('id', groupId)
        .maybeSingle()

      if (gerr) setError(gerr.message)
      setGroup(g as GroupRow)

      const { data: mem } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()

      setIsMember(!!mem)
      setLoading(false)
    })()
  }, [groupId, supabase])

  async function join() {
    setError(null)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) return

    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user.id,
      role: 'member',
    })

    if (error) return setError(error.message)
    setIsMember(true)
  }

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>
  if (!group) return <div style={{ padding: 24 }}>모임을 찾을 수 없어요.</div>

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Link href="/groups" style={{ textDecoration: 'underline' }}>
        ← 모임 목록
      </Link>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 12 }}>{group.title}</h1>
      <div style={{ marginTop: 6, opacity: 0.85 }}>
        {group.category} · {group.region} · 정원 {group.max_members}명
      </div>

      {group.description && <p style={{ marginTop: 12 }}>{group.description}</p>}

      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        {isMember ? (
          <Link
            href={`/groups/${groupId}/chat`}
            style={{
              padding: 12,
              borderRadius: 10,
              border: '1px solid #333',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            채팅방 들어가기
          </Link>
        ) : (
          <button onClick={join} style={{ padding: 12, borderRadius: 10 }}>
            참여하기
          </button>
        )}
      </div>
    </div>
  )
}