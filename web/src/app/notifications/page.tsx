'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'

type NotificationItem = {
  id: string
  kind: 'interest_received' | 'post_reaction' | 'new_conversation'
  actorNickname: string
  actorUserId: string
  detail: string
  href: string
  createdAt: string
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)

      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) {
        setError('로그인이 필요합니다.')
        setLoading(false)
        return
      }

      // 1) 나에게 온 관심
      const { data: interests, error: interestError } = await supabase
        .from('relationship_requests')
        .select('requester_user_id, created_at')
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      // 2) 내 피드에 달린 반응
      const { data: myPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', user.id)

      const myPostIds = (myPosts ?? []).map((p) => p.id as number)
      const { data: reactions, error: reactionError } =
        myPostIds.length > 0
          ? await supabase
              .from('post_reactions')
              .select('post_id, user_id, reaction_type, created_at')
              .in('post_id', myPostIds)
              .neq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(20)
          : { data: [], error: null }

      // 3) 새 대화 (내가 멤버인 conversation 중 최근)
      const { data: memberships, error: membershipError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id)

      const convIds = (memberships ?? []).map((m) => m.conversation_id as string)
      const { data: otherMembers, error: otherMemberError } =
        convIds.length > 0
          ? await supabase
              .from('conversation_members')
              .select('conversation_id, user_id')
              .in('conversation_id', convIds)
              .neq('user_id', user.id)
          : { data: [], error: null }

      if (interestError || reactionError || membershipError || otherMemberError) {
        setError(
          interestError?.message ||
          reactionError?.message ||
          membershipError?.message ||
          otherMemberError?.message ||
          '알림을 불러오지 못했습니다.'
        )
        setLoading(false)
        return
      }

      // 닉네임 일괄 조회
      const actorIds = Array.from(new Set([
        ...(interests ?? []).map((r) => r.requester_user_id as string),
        ...(reactions ?? []).map((r) => r.user_id as string),
        ...(otherMembers ?? []).map((m) => m.user_id as string),
      ]))

      const { data: profiles } = actorIds.length > 0
        ? await supabase.from('profiles').select('user_id, nickname').in('user_id', actorIds)
        : { data: [] as Array<{ user_id: string; nickname: string }> }

      const nicknameMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p.nickname ?? p.user_id.slice(0, 8)])
      )

      const notifications: NotificationItem[] = []

      for (const r of interests ?? []) {
        const uid = r.requester_user_id as string
        notifications.push({
          id: `interest-${uid}`,
          kind: 'interest_received',
          actorUserId: uid,
          actorNickname: nicknameMap.get(uid) ?? '누군가',
          detail: '님이 관심을 보냈어요.',
          href: `/people/${uid}`,
          createdAt: r.created_at as string,
        })
      }

      for (const r of reactions ?? []) {
        const uid = r.user_id as string
        notifications.push({
          id: `reaction-${r.post_id}-${uid}-${r.reaction_type}`,
          kind: 'post_reaction',
          actorUserId: uid,
          actorNickname: nicknameMap.get(uid) ?? '누군가',
          detail: `님이 내 피드에 "${r.reaction_type as string}" 반응을 남겼어요.`,
          href: `/posts/${r.post_id as number}`,
          createdAt: r.created_at as string,
        })
      }

      // conversation: convId별 대표 상대방 1명
      const seenConvIds = new Set<string>()
      for (const m of otherMembers ?? []) {
        const convId = m.conversation_id as string
        if (seenConvIds.has(convId)) continue
        seenConvIds.add(convId)
        const uid = m.user_id as string
        notifications.push({
          id: `conv-${convId}`,
          kind: 'new_conversation',
          actorUserId: uid,
          actorNickname: nicknameMap.get(uid) ?? '누군가',
          detail: '님과의 대화가 시작됐어요.',
          href: `/messages/${convId}`,
          createdAt: '',
        })
      }

      // 날짜 기준 정렬 (날짜 없는 항목은 뒤로)
      notifications.sort((a, b) => {
        if (!a.createdAt) return 1
        if (!b.createdAt) return -1
        return b.createdAt.localeCompare(a.createdAt)
      })

      setItems(notifications)
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>알림</h1>
      <p style={{ marginTop: 8, color: '#57534e' }}>
        받은 관심, 피드 반응, 새 대화를 확인하세요.
      </p>
      <AppNav />

      <section style={{ marginTop: 20, display: 'grid', gap: 12 }}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: 18,
              borderRadius: 18,
              border: '1px solid #e7e5e4',
              background: '#fff',
              textDecoration: 'none',
              color: '#1c1917',
            }}
          >
            <KindBadge kind={item.kind} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700 }}>{item.actorNickname}</span>
              <span style={{ color: '#57534e' }}>{item.detail}</span>
            </div>
            {item.createdAt && (
              <div style={{ color: '#78716c', fontSize: 13, whiteSpace: 'nowrap' }}>
                {formatDate(item.createdAt)}
              </div>
            )}
          </Link>
        ))}
        {items.length === 0 && (
          <div style={{ padding: 24, borderRadius: 16, background: '#fafaf9', color: '#57534e' }}>
            아직 알림이 없어요.
          </div>
        )}
      </section>
    </div>
  )
}

function KindBadge({ kind }: { kind: NotificationItem['kind'] }) {
  const map: Record<NotificationItem['kind'], { label: string; bg: string }> = {
    interest_received: { label: '관심', bg: '#fef9c3' },
    post_reaction:     { label: '반응', bg: '#dcfce7' },
    new_conversation:  { label: '대화', bg: '#dbeafe' },
  }
  const { label, bg } = map[kind]
  return (
    <div
      style={{
        padding: '6px 10px',
        borderRadius: 999,
        background: bg,
        fontWeight: 700,
        fontSize: 13,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}/${date.getDate()}`
}
