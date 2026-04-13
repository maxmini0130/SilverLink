'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'

type ConversationRow = {
  id: string
  kind: string
  created_at: string
  updated_at: string
}

type ProfileRow = {
  user_id: string
  nickname: string
  avatar_url: string | null
}

type MessageRow = {
  conversation_id: string
  message: string
  created_at: string
}

type ConversationSummary = {
  id: string
  otherProfile: ProfileRow | null
  latestMessage: string | null
  updatedAt: string
}

export default function MessagesPage() {
  const supabase = createClient()
  const [items, setItems] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)

      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) {
        setLoading(false)
        setError('로그인이 필요합니다.')
        return
      }

      const { data: memberships, error: membershipError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id)

      if (membershipError) {
        setError(membershipError.message)
        setLoading(false)
        return
      }

      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocker_user_id,blocked_user_id')
        .or(`blocker_user_id.eq.${user.id},blocked_user_id.eq.${user.id}`)

      const conversationIds = (memberships ?? []).map((row) => row.conversation_id as string)
      if (conversationIds.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      const [conversationsRes, membersRes, messagesRes] = await Promise.all([
        supabase
          .from('conversations')
          .select('id,kind,created_at,updated_at')
          .in('id', conversationIds)
          .order('updated_at', { ascending: false }),
        supabase
          .from('conversation_members')
          .select('conversation_id,user_id')
          .in('conversation_id', conversationIds),
        supabase
          .from('messages')
          .select('conversation_id,message,created_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false }),
      ])

      if (conversationsRes.error || membersRes.error || messagesRes.error) {
        setError(conversationsRes.error?.message || membersRes.error?.message || messagesRes.error?.message || '대화를 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      const conversations = (conversationsRes.data ?? []) as ConversationRow[]
      const members = (membersRes.data ?? []) as Array<{ conversation_id: string; user_id: string }>
      const latestMessages = new Map<string, MessageRow>()
      for (const row of (messagesRes.data ?? []) as MessageRow[]) {
        if (!latestMessages.has(row.conversation_id)) latestMessages.set(row.conversation_id, row)
      }

      const otherUserIds = Array.from(
        new Set(
          members
            .filter((member) => member.user_id !== user.id)
            .map((member) => member.user_id)
        )
      )

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id,nickname,avatar_url')
        .in('user_id', otherUserIds)

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      const profileMap = new Map(
        ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.user_id, profile])
      )

      const blockedIds = new Set(
        (blocks ?? []).map((row) =>
          row.blocker_user_id === user.id ? row.blocked_user_id : row.blocker_user_id
        )
      )

      const summaries = conversations.map((conversation) => {
        const otherMember = members.find(
          (member) => member.conversation_id === conversation.id && member.user_id !== user.id
        )
        return {
          id: conversation.id,
          otherProfile: otherMember ? profileMap.get(otherMember.user_id) ?? null : null,
          latestMessage: latestMessages.get(conversation.id)?.message ?? null,
          updatedAt: latestMessages.get(conversation.id)?.created_at ?? conversation.updated_at,
        }
      }).filter((item) => !item.otherProfile || !blockedIds.has(item.otherProfile.user_id))

      setItems(summaries)
      setLoading(false)
    })()
  }, [supabase])

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>대화</h1>
      <p style={{ marginTop: 8, color: '#57534e' }}>
        상호 관심, 1촌, 같은 모임 조건을 만족한 대화만 여기에 표시됩니다.
      </p>
      <AppNav />

      <section style={{ marginTop: 20, display: 'grid', gap: 14 }}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/messages/${item.id}`}
            style={{
              display: 'block',
              padding: 18,
              borderRadius: 18,
              border: '1px solid #e7e5e4',
              background: '#fff',
              color: '#1c1917',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <ProfileAvatar
                avatarUrl={item.otherProfile?.avatar_url ?? null}
                nickname={item.otherProfile?.nickname ?? '대화 상대'}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {item.otherProfile?.nickname ?? '알 수 없는 사용자'}
                </div>
                <div style={{ marginTop: 6, color: '#57534e' }}>
                  {item.latestMessage ?? '아직 메시지가 없어요. 먼저 인사를 건네보세요.'}
                </div>
              </div>
              <div style={{ color: '#78716c', fontSize: 13 }}>{formatDate(item.updatedAt)}</div>
            </div>
          </Link>
        ))}
        {items.length === 0 && (
          <div style={{ padding: 24, borderRadius: 16, background: '#fafaf9', color: '#57534e' }}>
            아직 시작한 개인 대화가 없어요. 사람 프로필에서 대화를 시작해 보세요.
          </div>
        )}
      </section>
    </div>
  )
}

function ProfileAvatar({
  avatarUrl,
  nickname,
}: {
  avatarUrl: string | null
  nickname: string
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${nickname} 프로필 사진`}
        style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', background: '#e7e5e4' }}
      />
    )
  }

  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: '#d6d3d1',
        fontWeight: 700,
      }}
    >
      {nickname.slice(0, 1)}
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}/${date.getDate()}`
}
