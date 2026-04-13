'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type SafetyActionsProps = {
  targetUserId: string
  postId?: number
  messageId?: number
  compact?: boolean
}

export function SafetyActions({
  targetUserId,
  postId,
  messageId,
  compact = false,
}: SafetyActionsProps) {
  const supabase = createClient()
  const [blocked, setBlocked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user || user.id === targetUserId) return

      const { data } = await supabase
        .from('blocks')
        .select('blocker_user_id')
        .eq('blocker_user_id', user.id)
        .eq('blocked_user_id', targetUserId)
        .maybeSingle()

      setBlocked(!!data)
    })()
  }, [supabase, targetUserId])

  async function toggleBlock() {
    setSubmitting(true)
    setError(null)
    setMessage(null)

    const response = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId,
        action: blocked ? 'unblock' : 'block',
      }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { blocked?: boolean; error?: string }
      | null

    if (!response.ok) {
      setError(payload?.error ?? '차단 처리에 실패했습니다.')
      setSubmitting(false)
      return
    }

    setBlocked(!!payload?.blocked)
    setMessage(payload?.blocked ? '사용자를 차단했습니다.' : '차단을 해제했습니다.')
    setSubmitting(false)
  }

  async function report() {
    const reason = window.prompt('신고 사유를 입력해 주세요. 예: 부적절한 메시지')
    if (!reason?.trim()) return
    const detail = window.prompt('추가 설명이 있다면 적어 주세요. 없으면 비워도 됩니다.') ?? ''

    setSubmitting(true)
    setError(null)
    setMessage(null)

    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId,
        postId,
        messageId,
        reason,
        detail,
      }),
    })

    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) {
      setError(payload?.error ?? '신고 접수에 실패했습니다.')
      setSubmitting(false)
      return
    }

    setMessage('신고가 접수되었습니다.')
    setSubmitting(false)
  }

  return (
    <div style={{ marginTop: compact ? 8 : 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={toggleBlock} disabled={submitting} style={buttonStyle(compact)}>
          {submitting ? '처리 중...' : blocked ? '차단 해제' : '차단'}
        </button>
        <button type="button" onClick={report} disabled={submitting} style={buttonStyle(compact)}>
          신고
        </button>
      </div>
      {(error || message) && (
        <p style={{ marginTop: 8, color: error ? 'crimson' : '#166534', fontSize: compact ? 12 : 13 }}>
          {error ?? message}
        </p>
      )}
    </div>
  )
}

function buttonStyle(compact: boolean) {
  return {
    padding: compact ? '8px 12px' : '10px 14px',
    borderRadius: 999,
    border: '1px solid #d6d3d1',
    background: '#fff',
    color: '#1c1917',
    fontSize: compact ? 13 : 14,
  } as const
}
