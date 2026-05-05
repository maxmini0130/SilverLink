'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const REASONS = ['욕설/비방', '사기/금전 요구', '스팸/광고', '불건전한 내용', '개인정보 노출', '기타']

export default function ReportButton({ reportedUserId, myId }: { reportedUserId: string; myId: string }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [detail, setDetail] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit() {
    setLoading(true)
    await supabase.from('reports').insert({
      reporter_id: myId,
      reported_user_id: reportedUserId,
      reason,
      detail: detail.trim(),
    })
    setLoading(false)
    setDone(true)
    setOpen(false)
  }

  async function block() {
    await supabase.from('blocks').insert({ blocker_id: myId, blocked_id: reportedUserId })
    alert('차단했습니다.')
  }

  if (done) return <span style={{ fontSize: 14, color: 'var(--muted)' }}>신고 완료</span>

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 15, cursor: 'pointer', minHeight: 'auto', padding: '4px 8px' }}>
          신고
        </button>
        <button onClick={block} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 15, cursor: 'pointer', minHeight: 'auto', padding: '4px 8px' }}>
          차단
        </button>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }} onClick={() => setOpen(false)}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 640, margin: '0 auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>신고 사유 선택</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {REASONS.map((item) => (
                <button key={item} onClick={() => setReason(item)}
                  style={{ padding: '14px 16px', textAlign: 'left', borderRadius: 12, border: `2px solid ${reason === item ? 'var(--primary)' : 'var(--border)'}`, background: reason === item ? '#eff6ff' : 'white', fontSize: 17, cursor: 'pointer', minHeight: 'auto', color: reason === item ? 'var(--primary)' : 'var(--foreground)' }}>
                  {item}
                </button>
              ))}
            </div>
            <textarea className="input" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="추가 설명 (선택)" style={{ minHeight: 80, marginBottom: 16, resize: 'none' }} />
            <button className="btn-primary" onClick={submit} disabled={loading}>{loading ? '신고 중...' : '신고하기'}</button>
          </div>
        </div>
      )}
    </>
  )
}
