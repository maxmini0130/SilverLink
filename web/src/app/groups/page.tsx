'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type GroupRow = {
  id: string
  title: string
  category: string
  region: string
  description: string
  max_members: number
  created_at: string
}

export default function GroupsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setError(null)
      const { error: authError } = await supabase.auth.getUser()
      if (authError) setError(authError.message)

      const { data, error: queryError } = await supabase
        .from('groups')
        .select('id,title,category,region,description,max_members,created_at')
        .order('created_at', { ascending: false })

      if (queryError) setError(queryError.message)
      setGroups((data ?? []) as GroupRow[])
      setLoading(false)
    })()
  }, [supabase])

  if (loading) return <div className="page" style={{ color: 'var(--muted)' }}>로딩 중...</div>
  if (error) return <div className="page" style={{ color: 'crimson' }}>{error}</div>

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>모임</h1>
        <Link href="/admin/groups" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 15 }}>
          모임 만들기
        </Link>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {groups.map((group) => (
          <Link key={group.id} href={`/groups/${group.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div className="card">
              <div style={{ fontSize: 18, fontWeight: 700 }}>{group.title}</div>
              <div style={{ marginTop: 6, color: 'var(--muted)' }}>
                {group.category} · {group.region} · 정원 {group.max_members}명
              </div>
              {group.description && <div style={{ marginTop: 8, color: '#444' }}>{group.description}</div>}
            </div>
          </Link>
        ))}
        {groups.length === 0 && <div className="card" style={{ color: 'var(--muted)' }}>아직 모임이 없어요.</div>}
      </div>
    </div>
  )
}
