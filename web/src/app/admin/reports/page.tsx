'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ReportRow = {
  id: number
  reporter_user_id: string
  target_user_id: string | null
  group_id: string | null
  message_id: number | null
  reason: string
  detail: string | null
  status: 'open' | 'in_review' | 'closed'
  created_at: string
}

type ProfileRow = {
  user_id: string
  nickname: string
}

const STATUS_OPTIONS: Array<ReportRow['status']> = ['open', 'in_review', 'closed']

export default function AdminReportsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [reports, setReports] = useState<ReportRow[]>([])
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map())
  const [statusFilter, setStatusFilter] = useState<'all' | ReportRow['status']>('all')
  const [workingId, setWorkingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.replace('/login')

      const { data, error: adminError } = await supabase
        .from('app_admins')
        .select('user_id')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (adminError || !data) {
        setIsAdmin(false)
        return
      }

      setIsAdmin(true)

      const { data: reportRows, error: reportError } = await supabase
        .from('reports')
        .select('id,reporter_user_id,target_user_id,group_id,message_id,reason,detail,status,created_at')
        .order('created_at', { ascending: false })

      if (reportError) {
        setError(reportError.message)
        return
      }

      const typedReports = (reportRows ?? []) as ReportRow[]
      setReports(typedReports)

      const profileIds = Array.from(
        new Set(
          typedReports.flatMap((report) =>
            [report.reporter_user_id, report.target_user_id].filter(Boolean) as string[]
          )
        )
      )

      if (profileIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('user_id,nickname')
          .in('user_id', profileIds)

        if (profileError) {
          setError(profileError.message)
          return
        }

        setProfiles(
          new Map(((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.user_id, profile.nickname]))
        )
      }
    })()
  }, [router, supabase])

  const visibleReports = useMemo(() => {
    if (statusFilter === 'all') return reports
    return reports.filter((report) => report.status === statusFilter)
  }, [reports, statusFilter])

  async function updateStatus(reportId: number, status: ReportRow['status']) {
    setWorkingId(reportId)
    setError(null)

    const response = await fetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) {
      setError(payload?.error ?? '상태 변경에 실패했습니다.')
      setWorkingId(null)
      return
    }

    setReports((prev) =>
      prev.map((report) => (report.id === reportId ? { ...report, status } : report))
    )
    setWorkingId(null)
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
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>신고 관리</h1>
          <p style={{ marginTop: 8, color: '#57534e' }}>
            접수된 신고를 검토하고 상태를 변경합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/admin/groups" style={{ textDecoration: 'underline', color: '#57534e' }}>
            모임 관리
          </Link>
          <Link href="/" style={{ textDecoration: 'underline', color: '#57534e' }}>
            홈으로
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>상태 필터</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ReportRow['status'])}
          style={{ width: 240, padding: 12, fontSize: 16 }}
        >
          <option value="all">전체</option>
          <option value="open">open</option>
          <option value="in_review">in_review</option>
          <option value="closed">closed</option>
        </select>
      </div>

      {error && <p style={{ marginTop: 12, color: 'crimson' }}>{error}</p>}

      <section style={{ marginTop: 20, display: 'grid', gap: 14 }}>
        {visibleReports.map((report) => (
          <article
            key={report.id}
            style={{
              padding: 18,
              borderRadius: 18,
              border: '1px solid #e7e5e4',
              background: '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>신고 #{report.id}</div>
                <div style={{ marginTop: 6, color: '#57534e' }}>
                  신고자: {profiles.get(report.reporter_user_id) ?? report.reporter_user_id.slice(0, 8)}
                  {report.target_user_id &&
                    ` · 대상: ${profiles.get(report.target_user_id) ?? report.target_user_id.slice(0, 8)}`}
                </div>
              </div>
              <div style={{ color: '#78716c', fontSize: 13 }}>{formatDate(report.created_at)}</div>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700 }}>사유</div>
                <div style={{ marginTop: 4 }}>{report.reason}</div>
              </div>
              {report.detail && (
                <div>
                  <div style={{ fontWeight: 700 }}>상세 설명</div>
                  <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{report.detail}</div>
                </div>
              )}
              <div style={{ color: '#57534e' }}>
                {report.group_id && `모임 ID: ${report.group_id}`}
                {report.group_id && report.message_id && ' · '}
                {report.message_id && `메시지 ID: ${report.message_id}`}
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ color: '#57534e' }}>현재 상태: {report.status}</div>
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateStatus(report.id, status)}
                  disabled={workingId === report.id || status === report.status}
                  style={{ padding: '8px 12px' }}
                >
                  {workingId === report.id && status === report.status ? '처리 중...' : status}
                </button>
              ))}
            </div>
          </article>
        ))}
        {visibleReports.length === 0 && (
          <div style={{ padding: 24, borderRadius: 16, background: '#fafaf9', color: '#57534e' }}>
            현재 조건에 맞는 신고가 없어요.
          </div>
        )}
      </section>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}
