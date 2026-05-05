export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminReportsClient, { type Report } from './AdminReportsClient'

type ReportStatus = Report['status']

type ProfileRef = {
  nickname: string | null
}

type ReportRow = {
  id: number
  reason: string
  detail: string | null
  status: ReportStatus
  created_at: string
  reporter: ProfileRef | ProfileRef[] | null
  reported: ProfileRef | ProfileRef[] | null
}

function firstProfile(profile: ProfileRef | ProfileRef[] | null) {
  if (Array.isArray(profile)) return profile[0] ?? null
  return profile
}

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

  const reportRows = (reports ?? []) as unknown as ReportRow[]
  const normalizedReports: Report[] = reportRows.map((report) => ({
    id: report.id,
    reason: report.reason,
    detail: report.detail ?? '',
    status: report.status,
    created_at: report.created_at,
    reporter: { nickname: firstProfile(report.reporter)?.nickname ?? '알 수 없음' },
    reported: { nickname: firstProfile(report.reported)?.nickname ?? '알 수 없음' },
  }))

  return <AdminReportsClient reports={normalizedReports} />
}
