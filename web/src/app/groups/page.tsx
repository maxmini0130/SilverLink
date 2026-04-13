'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'

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
  const supabase = createClient()
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setError(null)
      const { error } = await supabase.auth.getUser()
      if (error) setError(error.message)

      const { data, error: qerr } = await supabase
        .from('groups')
        .select('id,title,category,region,description,max_members,created_at')
        .order('created_at', { ascending: false })

      if (qerr) setError(qerr.message)
      setGroups((data ?? []) as GroupRow[])
      setLoading(false)
    })()
  }, [supabase])

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>모임</h1>
        <Link href="/admin/groups" style={{ textDecoration: 'underline' }}>
          관리자: 모임 생성
        </Link>
      </div>
      <AppNav />

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/groups/${g.id}`}
            style={{
              display: 'block',
              padding: 16,
              border: '1px solid #333',
              borderRadius: 12,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>{g.title}</div>
            <div style={{ marginTop: 6, opacity: 0.85 }}>
              {g.category} · {g.region} · 정원 {g.max_members}명
            </div>
            {g.description && <div style={{ marginTop: 8, opacity: 0.8 }}>{g.description}</div>}
          </Link>
        ))}
        {groups.length === 0 && <div>아직 모임이 없어요. (관리자 페이지에서 생성)</div>}
      </div>
    </div>
  )
}
