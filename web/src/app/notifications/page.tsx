'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { Heart, Smile, MessageSquare, Bell, CheckCheck } from 'lucide-react'

type NotificationItem = {
  id: string
  kind: 'interest_received' | 'post_reaction' | 'new_conversation'
  actorNickname: string
  actorUserId: string
  detail: string
  href: string
  createdAt: string
  unread: boolean
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) { setError('로그인이 필요합니다.'); setLoading(false); return }
      setUserId(user.id)

      const { data: stateRow } = await supabase.from('user_notification_state').select('last_read_at').eq('user_id', user.id).maybeSingle()
      const lastReadAt = stateRow?.last_read_at ?? '1970-01-01T00:00:00Z'

      const { data: interests, error: interestError } = await supabase
        .from('relationship_requests').select('requester_user_id, created_at').eq('target_user_id', user.id).order('created_at', { ascending: false }).limit(20)

      const { data: myPosts } = await supabase.from('posts').select('id').eq('user_id', user.id)
      const myPostIds = (myPosts ?? []).map((p) => p.id as number)
      const { data: reactions, error: reactionError } = myPostIds.length > 0
        ? await supabase.from('post_reactions').select('post_id, user_id, reaction_type, created_at').in('post_id', myPostIds).neq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
        : { data: [], error: null }

      const { data: memberships, error: membershipError } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id)
      const convIds = (memberships ?? []).map((m) => m.conversation_id as string)
      const { data: otherMembers, error: otherMemberError } = convIds.length > 0
        ? await supabase.from('conversation_members').select('conversation_id, user_id').in('conversation_id', convIds).neq('user_id', user.id)
        : { data: [], error: null }

      if (interestError || reactionError || membershipError || otherMemberError) {
        setError(interestError?.message || reactionError?.message || membershipError?.message || otherMemberError?.message || '알림을 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      const actorIds = Array.from(new Set([
        ...(interests ?? []).map((r) => r.requester_user_id as string),
        ...(reactions ?? []).map((r) => r.user_id as string),
        ...(otherMembers ?? []).map((m) => m.user_id as string),
      ]))
      const { data: profiles } = actorIds.length > 0
        ? await supabase.from('profiles').select('user_id, nickname').in('user_id', actorIds)
        : { data: [] as Array<{ user_id: string; nickname: string }> }
      const nicknameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.nickname ?? p.user_id.slice(0, 8)]))

      const notifications: NotificationItem[] = []
      const isUnread = (createdAt: string) => !!createdAt && createdAt.localeCompare(lastReadAt) > 0

      for (const r of interests ?? []) {
        const uid = r.requester_user_id as string
        const createdAt = r.created_at as string
        notifications.push({ id: `interest-${uid}`, kind: 'interest_received', actorUserId: uid, actorNickname: nicknameMap.get(uid) ?? '누군가', detail: '님이 관심을 보냈어요.', href: `/people/${uid}`, createdAt, unread: isUnread(createdAt) })
      }
      for (const r of reactions ?? []) {
        const uid = r.user_id as string
        const createdAt = r.created_at as string
        notifications.push({ id: `reaction-${r.post_id}-${uid}-${r.reaction_type}`, kind: 'post_reaction', actorUserId: uid, actorNickname: nicknameMap.get(uid) ?? '누군가', detail: `님이 내 피드에 "${r.reaction_type as string}" 반응을 남겼어요.`, href: `/posts/${r.post_id as number}`, createdAt, unread: isUnread(createdAt) })
      }
      const seenConvIds = new Set<string>()
      for (const m of otherMembers ?? []) {
        const convId = m.conversation_id as string
        if (seenConvIds.has(convId)) continue
        seenConvIds.add(convId)
        const uid = m.user_id as string
        notifications.push({ id: `conv-${convId}`, kind: 'new_conversation', actorUserId: uid, actorNickname: nicknameMap.get(uid) ?? '누군가', detail: '님과의 대화가 시작됐어요.', href: `/messages/${convId}`, createdAt: '', unread: false })
      }

      notifications.sort((a, b) => { if (!a.createdAt) return 1; if (!b.createdAt) return -1; return b.createdAt.localeCompare(a.createdAt) })
      setItems(notifications)
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function markAllRead() {
    if (!userId) return
    setMarking(true)
    const now = new Date().toISOString()
    const { error: upsertError } = await supabase.from('user_notification_state').upsert({ user_id: userId, last_read_at: now, updated_at: now }, { onConflict: 'user_id' })
    setMarking(false)
    if (upsertError) { setError(upsertError.message); return }
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })))
  }

  const unreadCount = items.filter((item) => item.unread).length

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="max-w-2xl mx-auto px-5 pt-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">알림</h1>
            <p className="mt-2 text-muted-foreground font-medium">
              받은 관심, 피드 반응, 새 대화를 확인하세요.
              {unreadCount > 0 && (
                <span className="ml-2 text-red-600 font-bold">새 알림 {unreadCount}개</span>
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={marking}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border/60 bg-white text-sm font-semibold hover:bg-muted/50 transition-colors disabled:opacity-60"
            >
              <CheckCheck size={16} />
              {marking ? '처리 중...' : '모두 읽음'}
            </button>
          )}
        </header>

        <AppNav />

        <section className="mt-6 space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-4 p-4 rounded-3xl border transition-all hover:shadow-sm ${
                item.unread
                  ? 'border-red-200 bg-red-50'
                  : 'border-border/50 bg-white'
              }`}
            >
              <KindIcon kind={item.kind} />
              <div className="flex-1 min-w-0">
                <p className="text-foreground leading-snug">
                  <span className="font-bold">{item.actorNickname}</span>
                  <span className="text-muted-foreground">{item.detail}</span>
                </p>
                {item.createdAt && (
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(item.createdAt)}</p>
                )}
              </div>
              {item.unread && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" aria-label="읽지 않음" />
              )}
            </Link>
          ))}
          {items.length === 0 && (
            <div className="text-center py-20 bg-white rounded-4xl border border-dashed border-border">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/30">
                <Bell size={40} />
              </div>
              <p className="text-muted-foreground font-bold text-lg">아직 알림이 없어요.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function KindIcon({ kind }: { kind: NotificationItem['kind'] }) {
  const map = {
    interest_received: { icon: <Heart size={18} className="text-secondary" />, bg: 'bg-secondary/10' },
    post_reaction: { icon: <Smile size={18} className="text-green-600" />, bg: 'bg-green-50' },
    new_conversation: { icon: <MessageSquare size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
  }
  const { icon, bg } = map[kind]
  return <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}/${date.getDate()}`
}
