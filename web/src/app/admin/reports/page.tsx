export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminReportsClient from './AdminReportsClient'

export default async function AdminReportsPage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('app_admins')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!adminRow) {
    return (
      <div className="page">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>관리자 전용</h1>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>이 페이지는 관리자만 접근할 수 있어요.</p>
      </div>
    )
  }

  const { data: reports } = await supabase
    .from('reports')
    .select(`
      id, reason, detail, status, created_at,
      reporter:profiles!reports_reporter_id_fkey(nickname),
      reported:profiles!reports_reported_user_id_fkey(nickname)
    `)
    .order('created_at', { ascending: false })

  return <AdminReportsClient reports={(reports ?? []) as any} />
}
