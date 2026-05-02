'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Report = {
  id: number
  reason: string
  detail: string
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  created_at: string
  reporter: { nickname: string }
  reported: { nickname: string }
}

const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ 대기',
  reviewed: '👀 검토 중',
  resolved: '✅ 처리 완료',
  dismissed: '❌ 기각',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  reviewed: '#3b82f6',
  resolved: '#16a34a',
  dismissed: '#9ca3af',
}

export default function AdminReportsClient({ reports: initialReports }: { reports: Report[] }) {
  const supabase = createClient()
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [filter, setFilter] = useState<string>('all')

  async function updateStatus(id: number, status: Report['status']) {
    await supabase.from('reports').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setReports(reports.map((r) => r.id === id ? { ...r, status } : r))
  }

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.status === filter)

  return (
    <div className="page">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>신고 관리</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 20 }}>총 {reports.length}건 · 대기 {reports.filter((r) => r.status === 'pending').length}건</p>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'pending', 'reviewed', 'resolved', 'dismissed'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '10px 16px', borderRadius: 999, border: `2px solid ${filter === s ? 'var(--primary)' : 'var(--border)'}`, background: filter === s ? 'var(--primary)' : 'white', color: filter === s ? 'white' : 'var(--foreground)', fontSize: 15, cursor: 'pointer', minHeight: 'auto' }}>
            {s === 'all' ? '전체' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>신고가 없어요.</div>
        )}
        {filtered.map((r) => (
          <div key={r.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 17 }}>
                  {r.reporter?.nickname ?? '알 수 없음'} → {r.reported?.nickname ?? '알 수 없음'}
                </span>
                <div style={{ marginTop: 4, fontSize: 15, color: 'var(--muted)' }}>
                  {new Date(r.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
              <span style={{ color: STATUS_COLORS[r.status], fontWeight: 600, fontSize: 15 }}>
                {STATUS_LABELS[r.status]}
              </span>
            </div>

            <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>사유: {r.reason}</div>
              {r.detail && <div style={{ color: '#444', fontSize: 15, marginTop: 4 }}>{r.detail}</div>}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['reviewed', 'resolved', 'dismissed'] as const).map((s) => (
                r.status !== s && (
                  <button key={s} onClick={() => updateStatus(r.id, s)}
                    style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'white', fontSize: 14, cursor: 'pointer', minHeight: 'auto', color: STATUS_COLORS[s] }}>
                    {STATUS_LABELS[s]}
                  </button>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
