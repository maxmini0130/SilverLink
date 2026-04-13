'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type RelationshipActionsProps = {
  targetUserId: string
  compact?: boolean
}

type RelationshipState = {
  currentUserId: string | null
  sentInterest: boolean
  receivedInterest: boolean
  isFriend: boolean
  sharedGroupCount: number
}

const initialState: RelationshipState = {
  currentUserId: null,
  sentInterest: false,
  receivedInterest: false,
  isFriend: false,
  sharedGroupCount: 0,
}

export function RelationshipActions({
  targetUserId,
  compact = false,
}: RelationshipActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [state, setState] = useState<RelationshipState>(initialState)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user || user.id === targetUserId) {
        if (active) {
          setState({ ...initialState, currentUserId: user?.id ?? null })
          setLoading(false)
        }
        return
      }

      const [sentRes, receivedRes, friendRes, myMembershipsRes, targetMembershipsRes] = await Promise.all([
        supabase
          .from('relationship_requests')
          .select('requester_user_id')
          .eq('requester_user_id', user.id)
          .eq('target_user_id', targetUserId)
          .maybeSingle(),
        supabase
          .from('relationship_requests')
          .select('requester_user_id')
          .eq('requester_user_id', targetUserId)
          .eq('target_user_id', user.id)
          .maybeSingle(),
        supabase
          .from('friendships')
          .select('user_low_id')
          .eq('user_low_id', orderedIds(user.id, targetUserId).low)
          .eq('user_high_id', orderedIds(user.id, targetUserId).high)
          .maybeSingle(),
        supabase.from('group_members').select('group_id').eq('user_id', user.id),
        supabase.from('group_members').select('group_id').eq('user_id', targetUserId),
      ])

      if (!active) return

      const myGroupIds = new Set((myMembershipsRes.data ?? []).map((row) => row.group_id as string))
      const sharedGroupCount = (targetMembershipsRes.data ?? []).filter((row) =>
        myGroupIds.has(row.group_id as string)
      ).length

      setState({
        currentUserId: user.id,
        sentInterest: !!sentRes.data,
        receivedInterest: !!receivedRes.data,
        isFriend: !!friendRes.data,
        sharedGroupCount,
      })

      const firstError =
        sentRes.error ||
        receivedRes.error ||
        friendRes.error ||
        myMembershipsRes.error ||
        targetMembershipsRes.error

      setError(firstError?.message ?? null)
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [supabase, targetUserId])

  const isMutualInterest = state.sentInterest && state.receivedInterest
  const canBecomeFriend = !state.isFriend && (isMutualInterest || state.sharedGroupCount > 0)
  const canChat = state.isFriend || isMutualInterest || state.sharedGroupCount > 0
  const statusLabel = useMemo(() => {
    if (!state.currentUserId || state.currentUserId === targetUserId) return null
    if (state.isFriend) return '1촌'
    if (isMutualInterest) return '상호 관심'
    if (state.sentInterest) return '내가 관심 보냄'
    if (state.receivedInterest) return '상대가 나에게 관심 보냄'
    if (state.sharedGroupCount > 0) return `같은 모임 ${state.sharedGroupCount}개`
    return '관계 없음'
  }, [
    isMutualInterest,
    state.currentUserId,
    state.isFriend,
    state.receivedInterest,
    state.sentInterest,
    state.sharedGroupCount,
    targetUserId,
  ])

  async function sendInterest() {
    if (!state.currentUserId) return
    setActing(true)
    setError(null)

    const { error: insertError } = await supabase.from('relationship_requests').insert({
      requester_user_id: state.currentUserId,
      target_user_id: targetUserId,
    })

    if (insertError && !insertError.message.toLowerCase().includes('duplicate')) {
      setError(insertError.message)
      setActing(false)
      return
    }

    setState((prev) => ({ ...prev, sentInterest: true }))
    setActing(false)
  }

  async function makeFriend() {
    if (!state.currentUserId || !canBecomeFriend) return
    setActing(true)
    setError(null)

    const { low, high } = orderedIds(state.currentUserId, targetUserId)
    const { error: insertError } = await supabase.from('friendships').insert({
      user_low_id: low,
      user_high_id: high,
    })

    if (insertError && !insertError.message.toLowerCase().includes('duplicate')) {
      setError(insertError.message)
      setActing(false)
      return
    }

    setState((prev) => ({ ...prev, isFriend: true }))
    setActing(false)
  }

  async function startChat() {
    setActing(true)
    setError(null)

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { conversationId?: string; error?: string }
        | null

      if (!response.ok || !payload?.conversationId) {
        throw new Error(payload?.error ?? '대화를 시작하지 못했습니다.')
      }

      router.push(`/messages/${payload.conversationId}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '대화를 시작하지 못했습니다.')
      setActing(false)
      return
    }

    setActing(false)
  }

  if (loading) {
    return <div style={{ color: '#78716c', fontSize: compact ? 13 : 14 }}>관계 확인 중...</div>
  }

  if (!state.currentUserId || state.currentUserId === targetUserId) {
    return null
  }

  return (
    <div style={{ marginTop: compact ? 10 : 14 }}>
      <div style={{ color: '#57534e', fontSize: compact ? 13 : 14 }}>{statusLabel}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {!state.sentInterest && !state.isFriend && (
          <button
            type="button"
            onClick={sendInterest}
            disabled={acting}
            style={buttonStyle('#1c1917', '#fff', compact)}
          >
            {acting ? '처리 중...' : '관심 보내기'}
          </button>
        )}
        {canBecomeFriend && (
          <button
            type="button"
            onClick={makeFriend}
            disabled={acting}
            style={buttonStyle('#f5f5f4', '#1c1917', compact)}
          >
            {acting ? '처리 중...' : '1촌 맺기'}
          </button>
        )}
        {canChat && (
          <button
            type="button"
            onClick={startChat}
            disabled={acting}
            style={buttonStyle('#fff', '#1c1917', compact)}
          >
            {acting ? '처리 중...' : '대화 시작'}
          </button>
        )}
      </div>
      {state.sharedGroupCount > 0 && !state.isFriend && (
        <p style={{ marginTop: 8, color: '#78716c', fontSize: compact ? 12 : 13 }}>
          같은 모임에 함께 참여 중이라 1촌으로 연결할 수 있어요.
        </p>
      )}
      {error && <p style={{ marginTop: 8, color: 'crimson', fontSize: compact ? 12 : 13 }}>{error}</p>}
    </div>
  )
}

function orderedIds(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a }
}

function buttonStyle(background: string, color: string, compact: boolean) {
  return {
    padding: compact ? '8px 12px' : '10px 14px',
    borderRadius: 999,
    border: '1px solid #d6d3d1',
    background,
    color,
    fontSize: compact ? 13 : 15,
    fontWeight: 600,
  } as const
}
