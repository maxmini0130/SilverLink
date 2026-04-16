'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Heart, MessageSquare, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [toast, setToast] = useState<string | null>(null)

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
    if (state.isFriend) return '1촌 사이예요'
    if (isMutualInterest) return '서로 관심을 보낸 사이예요'
    if (state.sentInterest) return '내가 관심을 보냈어요'
    if (state.receivedInterest) return '나에게 관심을 보낸 분이에요'
    if (state.sharedGroupCount > 0) return '같은 모임에 함께 있어요'
    return null
  }, [
    isMutualInterest,
    state.currentUserId,
    state.isFriend,
    state.receivedInterest,
    state.sentInterest,
    state.sharedGroupCount,
    targetUserId,
  ])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2400)
  }

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
    showToast('관심을 보냈어요')
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
    showToast('1촌이 되었어요')
    setActing(false)
  }

  async function startChat() {
    setActing(true)
    setError(null)

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { conversationId?: string; error?: string }
        | null

      if (!response.ok || !payload?.conversationId) {
        throw new Error(payload?.error ?? '대화를 시작하지 못했어요.')
      }

      router.push(`/messages/${payload.conversationId}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '대화를 시작하지 못했어요.')
      setActing(false)
      return
    }

    setActing(false)
  }

  if (loading) {
    return (
      <div className={cn('text-muted-foreground', compact ? 'text-sm' : 'text-base')}>
        관계 확인 중...
      </div>
    )
  }

  if (!state.currentUserId || state.currentUserId === targetUserId) {
    return null
  }

  const primaryBtn = cn(
    'inline-flex items-center gap-2 rounded-full font-bold transition-colors disabled:opacity-50',
    compact ? 'px-4 py-2 text-sm' : 'px-5 py-3 text-base',
    'bg-primary text-white hover:opacity-90',
  )
  const secondaryBtn = cn(
    'inline-flex items-center gap-2 rounded-full font-bold transition-colors disabled:opacity-50',
    compact ? 'px-4 py-2 text-sm' : 'px-5 py-3 text-base',
    'bg-white text-foreground border border-border hover:bg-muted',
  )

  return (
    <div className={cn(compact ? 'mt-2.5' : 'mt-3.5')}>
      {statusLabel && (
        <div className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>
          {statusLabel}
        </div>
      )}

      <div className="flex gap-2 flex-wrap mt-2">
        {!state.sentInterest && !state.isFriend && (
          <button type="button" onClick={sendInterest} disabled={acting} className={primaryBtn}>
            <Heart size={compact ? 14 : 16} />
            {acting ? '처리 중...' : '관심 보내기'}
          </button>
        )}
        {canBecomeFriend && (
          <button type="button" onClick={makeFriend} disabled={acting} className={secondaryBtn}>
            <Users size={compact ? 14 : 16} />
            {acting ? '처리 중...' : '1촌 맺기'}
          </button>
        )}
        {canChat && (
          <button type="button" onClick={startChat} disabled={acting} className={secondaryBtn}>
            <MessageSquare size={compact ? 14 : 16} />
            {acting ? '처리 중...' : '대화 시작'}
          </button>
        )}
      </div>

      {!canChat && (
        <ChatEligibility state={state} compact={compact} />
      )}

      {toast && (
        <p className={cn('mt-2 font-semibold text-primary', compact ? 'text-sm' : 'text-base')}>
          {toast}
        </p>
      )}

      {error && (
        <p className={cn('mt-2 text-red-600', compact ? 'text-sm' : 'text-base')}>
          {error}
        </p>
      )}
    </div>
  )
}

function ChatEligibility({ state, compact }: { state: RelationshipState; compact: boolean }) {
  const mutualMet = state.sentInterest && state.receivedInterest
  const friendMet = state.isFriend
  const groupMet = state.sharedGroupCount > 0

  const mutualLabel = mutualMet
    ? '서로 관심을 보냈어요'
    : state.sentInterest
      ? '내 관심을 보냈어요. 상대의 답을 기다려요'
      : state.receivedInterest
        ? '상대가 관심을 보냈어요. 관심을 돌려보내면 대화할 수 있어요'
        : '서로 관심을 보내면 대화할 수 있어요'

  const groupLabel = groupMet
    ? `같은 모임에 ${state.sharedGroupCount}개 함께 있어요`
    : '같은 모임에 함께 참여해도 대화할 수 있어요'

  const friendLabel = friendMet
    ? '1촌 사이예요'
    : '상호 관심 또는 같은 모임 참여 후 1촌을 맺을 수 있어요'

  return (
    <div
      className={cn(
        'mt-3 rounded-2xl border border-border/60 bg-muted/40 p-4',
        compact ? 'text-sm' : 'text-base',
      )}
    >
      <p className="font-bold text-foreground mb-2">대화를 시작하려면 다음 중 하나가 필요해요</p>
      <ul className="space-y-1.5">
        <ConditionRow met={mutualMet} label={mutualLabel} />
        <ConditionRow met={groupMet} label={groupLabel} />
        <ConditionRow met={friendMet} label={friendLabel} />
      </ul>
    </div>
  )
}

function ConditionRow({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={cn(
          'mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
          met ? 'bg-primary text-white' : 'bg-muted text-muted-foreground',
        )}
      >
        {met ? <Check size={13} /> : <X size={13} />}
      </span>
      <span className={cn('leading-relaxed', met ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
        {label}
      </span>
    </li>
  )
}

function orderedIds(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a }
}
